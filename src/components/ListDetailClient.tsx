"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Item, List } from "@/lib/supabase/types";
import RankItem from "./RankItem";
import AddItemModal from "./AddItemModal";
import ShareModal, { type MemberWithProfile } from "./ShareModal";

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
}

export default function ListDetailClient({
  list,
  initialItems,
  userId,
  latestVote,
  isOwner,
  initialMembers,
}: Props) {
  const [tab, setTab] = useState<"pending" | "done">("pending");
  const [items, setItems] = useState<Item[]>(initialItems);
  const [votedItemId, setVotedItemId] = useState<string | null>(
    latestVote?.voted_date === localToday() ? latestVote.item_id : null
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
    if (votedItemId || voting) return;

    setVoting(true);

    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const { error: voteError } = await supabase.from("votes").insert({
      item_id: itemId,
      user_id: userId,
      list_id: list.id,
      voted_date: today,
    });

    if (voteError) {
      setVoting(false);
      return;
    }

    // Update total_votes counter
    const item = items.find((i) => i.id === itemId);
    if (item) {
      await supabase
        .from("items")
        .update({ total_votes: item.total_votes + 1 })
        .eq("id", itemId);
    }

    setVotedItemId(itemId);
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
    setDeleting(true);
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
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-muted hover:text-text transition-colors"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-2xl">{list.emoji}</span>
          <h1 className="text-lg font-semibold text-text">{list.name}</h1>
        </div>

        <div className="flex items-center gap-2">
          {isOwner && (
            <>
              <button
                onClick={() => setShowShareModal(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors text-muted hover:text-text hover:bg-surface"
                aria-label="Compartir lista"
              >
                <UserPlus size={18} />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors text-muted hover:text-red-400 hover:bg-red-400/10"
                aria-label="Eliminar lista"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: "rgba(200, 169, 110, 0.15)" }}
          >
            <Plus size={20} color="#c8a96e" />
          </button>
        </div>
      </div>

      {/* Collaborators badge */}
      {members.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <div className="flex -space-x-1.5">
            {members.slice(0, 4).map((m) => (
              <div
                key={m.user_id}
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-semibold"
                style={{
                  backgroundColor: "rgba(200, 169, 110, 0.2)",
                  color: "#c8a96e",
                  borderColor: "#0a0a0f",
                }}
                title={m.username}
              >
                {m.username[0].toUpperCase()}
              </div>
            ))}
          </div>
          <span className="text-xs text-muted">
            {members.length === 1
              ? `Compartida con ${members[0].username}`
              : `Compartida con ${members.length} personas`}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 mb-6">
        <button
          onClick={() => setTab("pending")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
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
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
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
              <p className="text-3xl mb-3">🎬</p>
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
                  canVote={!votedItemId && !voting}
                  isVoted={votedItemId === item.id}
                  onVote={() => handleVote(item.id)}
                  onMarkDone={() => handleMarkDone(item.id)}
                  onEdit={() => setEditingItem(item)}
                  isFirst={index === 0}
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
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 cursor-pointer hover:opacity-70 transition-opacity"
                    style={{ backgroundColor: "rgba(200, 169, 110, 0.2)" }}
                    onClick={() => handleUnmarkDone(item.id)}
                    title="Volver a pendientes"
                  >
                    <span className="text-xs">✓</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text text-sm line-through truncate">
                      {item.title}
                    </p>
                    {item.category && (
                      <p className="text-muted text-xs mt-0.5">
                        {item.category}
                      </p>
                    )}
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

      {/* Add item modal */}
      {showAddModal && (
        <AddItemModal
          listId={list.id}
          userId={userId}
          onClose={() => setShowAddModal(false)}
          onSaved={onItemSaved}
        />
      )}

      {/* Edit item modal */}
      {editingItem && (
        <AddItemModal
          listId={list.id}
          userId={userId}
          editItem={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={onItemSaved}
          onDelete={() => {
            handleDeleteItem(editingItem.id);
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
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={(e) =>
            e.target === e.currentTarget && setShowDeleteConfirm(false)
          }
        >
          <div
            className="w-full max-w-lg bg-surface-2 rounded-t-3xl p-6 border-t border-border"
            style={{
              paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
            }}
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />

            <div className="text-center mb-6">
              <p className="text-3xl mb-3">{list.emoji}</p>
              <h2 className="text-lg font-semibold text-text mb-1">
                Eliminar lista
              </h2>
              <p className="text-muted text-sm">
                ¿Seguro que quieres eliminar{" "}
                <span className="text-text font-medium">{list.name}</span>? Esta
                acción no se puede deshacer.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl border border-border text-muted text-sm font-medium hover:text-text transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "#ef4444", color: "white" }}
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
