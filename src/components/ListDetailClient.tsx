"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, UserPlus, Pencil } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Item, List } from "@/lib/supabase/types";
import { TMDB_POSTER_BASE, getService } from "@/lib/services";
import RankItem from "./RankItem";
import AddItemModal from "./AddItemModal";
import ShareModal, { type MemberWithProfile } from "./ShareModal";
import CreateListModal from "./CreateListModal";
import ConfirmDeleteModal from "./ConfirmDeleteModal";

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Props {
  list: List;
  initialItems: Item[];
  userId: string;
  latestVote: { item_id: string; voted_date: string } | null;
  isOwner?: boolean;
  initialMembers: MemberWithProfile[];
  ownerUsername?: string | null;
}

export default function ListDetailClient({
  list,
  initialItems,
  userId,
  latestVote,
  isOwner,
  ownerUsername,
  initialMembers,
}: Props) {
  const [tab, setTab] = useState<"pending" | "done">("pending");
  const [items, setItems] = useState<Item[]>(initialItems);
  const [votedItemId, setVotedItemId] = useState<string | null>(
    latestVote?.voted_date === localToday() ? latestVote.item_id : null
  );
  const [listName, setListName] = useState(list.name);
  const [listEmoji, setListEmoji] = useState(list.emoji);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditListModal, setShowEditListModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [voting, setVoting] = useState(false);
  const [timeUntilMidnight, setTimeUntilMidnight] = useState("");
  const [members, setMembers] = useState<MemberWithProfile[]>(initialMembers);

  useEffect(() => {
    if (!votedItemId) return;
    const update = () => {
      const now = new Date();
      // Use local midnight — voted_date is stored as local date
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      if (diff <= 0) {
        setVotedItemId(null);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeUntilMidnight(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [votedItemId]);

  const router = useRouter();
  const supabase = createClient();

  const pendingItems = items
    .filter((i) => !i.completed)
    .sort((a, b) => b.total_votes - a.total_votes);

  const doneItems = items
    .filter((i) => i.completed)
    .sort(
      (a, b) =>
        new Date(b.completed_at ?? 0).getTime() -
        new Date(a.completed_at ?? 0).getTime()
    );

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`list-${list.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "items",
          filter: `list_id=eq.${list.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setItems((prev) => {
              const newItem = payload.new as Item;
              if (prev.some((i) => i.id === newItem.id)) return prev;
              return [...prev, newItem];
            });
          } else if (payload.eventType === "UPDATE") {
            setItems((prev) =>
              prev.map((item) =>
                item.id === (payload.new as Item).id
                  ? (payload.new as Item)
                  : item
              )
            );
          } else if (payload.eventType === "DELETE") {
            setItems((prev) =>
              prev.filter((item) => item.id !== (payload.old as Item).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [list.id, supabase]);

  async function handleVote(itemId: string) {
    if (voting) return;

    navigator.vibrate?.(10);
    setVoting(true);

    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    // Capture current state before any async operations
    const prevVotedItemId = votedItemId;
    const prevItems = items;

    const isRevoke = prevVotedItemId === itemId;

    // Optimistic UI update immediately
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === prevVotedItemId)
          return { ...i, total_votes: Math.max(0, i.total_votes - 1) };
        if (i.id === itemId && !isRevoke)
          return { ...i, total_votes: i.total_votes + 1 };
        return i;
      })
    );
    setVotedItemId(isRevoke ? null : itemId);

    // Revert helper
    const revert = (restoreVotedId: string | null) => {
      setItems(prevItems);
      setVotedItemId(restoreVotedId);
      setVoting(false);
    };

    // Remove existing vote from DB
    if (prevVotedItemId) {
      const { error: deleteError } = await supabase
        .from("votes")
        .delete()
        .eq("user_id", userId)
        .eq("list_id", list.id)
        .eq("voted_date", today);

      if (deleteError) {
        revert(prevVotedItemId);
        return;
      }

      const oldVotes = prevItems.find((i) => i.id === prevVotedItemId)?.total_votes ?? 0;
      await supabase
        .from("items")
        .update({ total_votes: Math.max(0, oldVotes - 1) })
        .eq("id", prevVotedItemId);
    }

    if (isRevoke) {
      setVoting(false);
      return;
    }

    // Insert new vote
    const { error: voteError } = await supabase.from("votes").insert({
      item_id: itemId,
      user_id: userId,
      list_id: list.id,
      voted_date: today,
    });

    if (voteError) {
      revert(prevVotedItemId);
      return;
    }

    const newVotes = prevItems.find((i) => i.id === itemId)?.total_votes ?? 0;
    await supabase
      .from("items")
      .update({ total_votes: newVotes + 1 })
      .eq("id", itemId);

    setVoting(false);
  }

  async function handleUnmarkDone(itemId: string) {
    const { error } = await supabase
      .from("items")
      .update({ completed: false, completed_at: null })
      .eq("id", itemId);

    if (!error) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, completed: false, completed_at: null }
            : item
        )
      );
    }
  }

  async function handleMarkDone(itemId: string) {
    const { error } = await supabase
      .from("items")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("id", itemId);

    if (!error) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                completed: true,
                completed_at: new Date().toISOString(),
              }
            : item
        )
      );
    }
  }

  async function handleDeleteItem(itemId: string) {
    await supabase.from("items").delete().eq("id", itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  async function handleDelete() {
    await supabase.from("lists").delete().eq("id", list.id);
    router.replace("/home");
  }

  function onItemSaved(savedItem: Item) {
    setItems((prev) => {
      const exists = prev.some((i) => i.id === savedItem.id);
      if (exists) return prev.map((i) => (i.id === savedItem.id ? savedItem : i));
      return [...prev, savedItem];
    });
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-10 pb-4">
      {/* Header */}
      <div className="mb-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-muted hover:text-text transition-colors active:scale-95 active:transition-none"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Inicio</span>
          </button>

          <div className="flex items-center gap-1">
            {isOwner && (
              <>
                <button
                  onClick={() => setShowEditListModal(true)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors text-muted hover:text-text hover:bg-surface active:scale-95 active:transition-none"
                  aria-label="Editar lista"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors text-muted hover:text-text hover:bg-surface active:scale-95 active:transition-none"
                  aria-label="Compartir lista"
                >
                  <UserPlus size={18} />
                </button>
              </>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors active:scale-95 active:transition-none"
              style={{ backgroundColor: "rgba(200, 169, 110, 0.15)" }}
            >
              <Plus size={20} color="#c8a96e" />
            </button>
          </div>
        </div>

        {/* List info */}
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
            style={{
              backgroundColor: "rgba(200, 169, 110, 0.12)",
              border: "1px solid rgba(200, 169, 110, 0.2)",
            }}
          >
            {listEmoji}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text leading-tight">{listName}</h1>
            <p className="text-muted text-sm mt-0.5">
              {(() => {
                let label: string | null = null;
                if (!isOwner && ownerUsername) label = `De ${ownerUsername}`;
                else if (isOwner && members.length === 1) label = `Con ${members[0].username}`;
                else if (isOwner && members.length > 1) label = `Con ${members.length} personas`;
                return label ? `${label} · ` : null;
              })()}
              {pendingItems.length} pendiente{pendingItems.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 mb-6">
        <button
          onClick={() => setTab("pending")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all active:scale-[0.97] active:transition-none ${
            tab === "pending"
              ? "bg-gold text-bg"
              : "text-muted hover:text-text"
          }`}
        >
          Pendientes
          {pendingItems.length > 0 && (
            <span
              className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                tab === "pending"
                  ? "bg-bg/20 text-bg"
                  : "bg-surface-2 text-muted"
              }`}
            >
              {pendingItems.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("done")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all active:scale-[0.97] active:transition-none ${
            tab === "done" ? "bg-gold text-bg" : "text-muted hover:text-text"
          }`}
        >
          Vistos
          {doneItems.length > 0 && (
            <span
              className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                tab === "done"
                  ? "bg-bg/20 text-bg"
                  : "bg-surface-2 text-muted"
              }`}
            >
              {doneItems.length}
            </span>
          )}
        </button>
      </div>

      {/* Vote status banner */}
      {tab === "pending" && (
        <div
          className="mb-4 px-4 py-2.5 rounded-xl text-sm text-center"
          style={{
            backgroundColor: votedItemId
              ? "rgba(200, 169, 110, 0.08)"
              : "rgba(200, 169, 110, 0.15)",
            color: votedItemId ? "#8888a0" : "#c8a96e",
            border: `1px solid ${
              votedItemId
                ? "rgba(200, 169, 110, 0.1)"
                : "rgba(200, 169, 110, 0.3)"
            }`,
          }}
        >
          {votedItemId
            ? `✓ Ya votaste hoy · Regresa en ${timeUntilMidnight}`
            : "⚡ Tienes 1 voto disponible hoy"}
        </div>
      )}

      {/* Items */}
      {tab === "pending" && (
        <>
          {pendingItems.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-3xl mb-3">{list.emoji}</p>
              <p className="text-muted">
                No hay items pendientes.
                <br />
                Pulsa el + para añadir.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingItems.map((item, index) => (
                <RankItem
                  key={item.id}
                  item={item}
                  rank={index + 1}
                  canVote={!voting}
                  isVoted={votedItemId === item.id}
                  onVote={() => handleVote(item.id)}
                  onMarkDone={() => handleMarkDone(item.id)}
                  onEdit={() => setEditingItem(item)}
                  isFirst={index === 0}
                  listType={list.list_type}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "done" && (
        <>
          {doneItems.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-3xl mb-3">📭</p>
              <p className="text-muted">Aún no hay nada marcado como visto.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {doneItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-3 opacity-60"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer hover:opacity-70 transition-opacity active:scale-90 active:transition-none"
                    style={{ backgroundColor: "rgba(200, 169, 110, 0.2)" }}
                    onClick={() => handleUnmarkDone(item.id)}
                    title="Volver a pendientes"
                  >
                    <span className="text-xs">✓</span>
                  </div>
                  {!!(item.external_data as Record<string, unknown> | null)?.poster_path && (() => {
                    const path = (item.external_data as Record<string, unknown>).poster_path as string;
                    const src = path.startsWith("http") ? path : `${TMDB_POSTER_BASE}${path}`;
                    const isLandscape = getService(list.list_type)?.posterAspect === "landscape";
                    return (
                      <div
                        className="rounded overflow-hidden shrink-0 relative opacity-60"
                        style={{ width: isLandscape ? 44 : 28, height: isLandscape ? 25 : 42 }}
                      >
                        <Image src={src} alt={item.title} fill className="object-cover" />
                      </div>
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <p className="text-text text-sm line-through truncate">
                      {item.title}
                    </p>
                    {item.category && (() => {
                      try {
                        const url = new URL(item.category.trim());
                        const label = url.hostname.replace(/^www\./, "");
                        return (
                          <a
                            href={url.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs mt-0.5 truncate inline-flex hover:underline"
                            style={{ color: "#c8a96e" }}
                          >
                            {label}
                          </a>
                        );
                      } catch {
                        return (
                          <p className="text-muted text-xs mt-0.5">{item.category}</p>
                        );
                      }
                    })()}
                  </div>
                  <span className="text-muted text-xs">
                    {item.total_votes} voto{item.total_votes !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit list modal */}
      {showEditListModal && (
        <CreateListModal
          userId={userId}
          editList={{ ...list, name: listName, emoji: listEmoji }}
          onClose={() => setShowEditListModal(false)}
          onCreated={() => {}}
          onUpdated={(updated) => {
            setListName(updated.name);
            setListEmoji(updated.emoji);
            setShowEditListModal(false);
          }}
          onDelete={() => {
            setShowEditListModal(false);
            setShowDeleteConfirm(true);
          }}
        />
      )}

      {/* Add item modal */}
      {showAddModal && (
        <AddItemModal
          listId={list.id}
          userId={userId}
          listType={list.list_type}
          onClose={() => setShowAddModal(false)}
          onSaved={onItemSaved}
        />
      )}

      {/* Edit item modal */}
      {editingItem && (
        <AddItemModal
          listId={list.id}
          userId={userId}
          listType={list.list_type}
          editItem={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={onItemSaved}
          onMarkDone={() => {
            handleMarkDone(editingItem.id);
            setEditingItem(null);
          }}
          onDelete={async () => {
            await handleDeleteItem(editingItem.id);
            setEditingItem(null);
          }}
        />
      )}

      {/* Share modal */}
      {showShareModal && (
        <ShareModal
          listId={list.id}
          members={members}
          onClose={() => setShowShareModal(false)}
          onMembersChange={setMembers}
        />
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <ConfirmDeleteModal
          emoji={listEmoji}
          title="Eliminar lista"
          itemName={listName}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
