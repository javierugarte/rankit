"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Item, List } from "@/lib/supabase/types";
import RankItem from "./RankItem";
import AddItemModal from "./AddItemModal";

interface Props {
  list: List;
  initialItems: Item[];
  userId: string;
  todayVotedItemId: string | null;
}

export default function ListDetailClient({
  list,
  initialItems,
  userId,
  todayVotedItemId,
}: Props) {
  const [tab, setTab] = useState<"pending" | "done">("pending");
  const [items, setItems] = useState<Item[]>(initialItems);
  const [votedItemId, setVotedItemId] = useState<string | null>(
    todayVotedItemId
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [voting, setVoting] = useState(false);

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
            setItems((prev) => [...prev, payload.new as Item]);
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

    const today = new Date().toISOString().split("T")[0];

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

  function onItemAdded(newItem: Item) {
    setItems((prev) => [...prev, newItem]);
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

        <button
          onClick={() => setShowAddModal(true)}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: "rgba(200, 169, 110, 0.15)" }}
        >
          <Plus size={20} color="#c8a96e" />
        </button>
      </div>

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
          {votedItemId ? "✓ Ya votaste hoy" : "⚡ Tienes 1 voto disponible hoy"}
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
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "rgba(200, 169, 110, 0.2)" }}
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
          onAdded={onItemAdded}
        />
      )}
    </div>
  );
}
