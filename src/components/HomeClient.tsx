"use client";

import { useState, useEffect, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowUpDown, Check, GripVertical } from "lucide-react";
import ListCard from "./ListCard";
import CreateListButton from "./CreateListButton";
import { createClient } from "@/lib/supabase/client";
import type { List } from "@/lib/supabase/types";

const STORAGE_KEY = "rankit_list_order";

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function applyOrder(lists: List[], order: string[]): List[] {
  if (!order.length) return lists;
  const map = new Map(lists.map((l) => [l.id, l]));
  const ordered: List[] = [];
  for (const id of order) {
    if (map.has(id)) ordered.push(map.get(id)!);
  }
  for (const l of lists) {
    if (!order.includes(l.id)) ordered.push(l);
  }
  return ordered;
}

function SortableListCard({
  list,
  sharingLabel,
  totalVotes,
  votedToday,
  leader,
}: {
  list: List;
  sharingLabel: string;
  totalVotes: number;
  votedToday: boolean;
  leader: string | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: list.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button
        {...attributes}
        {...listeners}
        className="text-muted hover:text-text p-2 touch-none cursor-grab active:cursor-grabbing"
        aria-label="Arrastrar para reordenar"
      >
        <GripVertical size={18} />
      </button>
      <div className="flex-1 pointer-events-none">
        <ListCard list={list} sharingLabel={sharingLabel} totalVotes={totalVotes} votedToday={votedToday} leader={leader} />
      </div>
    </div>
  );
}

interface Props {
  lists: List[];
  sharingMap: Record<string, string>;
  totalVotesMap: Record<string, number>;
  votedTodayIds: string[];
  leaderMap: Record<string, string | null>;
  userId: string;
}

export default function HomeClient({ lists, sharingMap, totalVotesMap: initialTotalVotesMap, votedTodayIds: initialVotedTodayIds, leaderMap: initialLeaderMap, userId }: Props) {
  const [sortMode, setSortMode] = useState(false);
  const [orderedLists, setOrderedLists] = useState<List[]>(lists);

  // Live vote data managed client-side
  const [totalVotesMap, setTotalVotesMap] = useState(initialTotalVotesMap);
  const [leaderMap, setLeaderMap] = useState(initialLeaderMap);
  const [votedTodayIds, setVotedTodayIds] = useState(initialVotedTodayIds);

  const votedTodaySet = new Set(votedTodayIds);

  // Single stable Supabase client instance for this component
  const supabase = useRef(createClient()).current;

  // Refs to always have fresh values inside the stable realtime callback
  const listsRef = useRef(lists);
  const userIdRef = useRef(userId);
  useEffect(() => { listsRef.current = lists; }, [lists]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  async function refreshVoteData() {
    const listIds = listsRef.current.map((l) => l.id);
    if (listIds.length === 0) return;

    const today = localToday();
    const [itemsResult, todayVotesResult] = await Promise.all([
      supabase
        .from("items")
        .select("list_id, total_votes, title")
        .in("list_id", listIds)
        .eq("completed", false)
        .order("total_votes", { ascending: false }),
      supabase
        .from("votes")
        .select("list_id")
        .eq("user_id", userIdRef.current)
        .in("list_id", listIds)
        .eq("voted_date", today),
    ]);

    const newTotalVotesMap: Record<string, number> = {};
    const newLeaderMap: Record<string, string | null> = {};
    for (const item of itemsResult.data ?? []) {
      newTotalVotesMap[item.list_id] = (newTotalVotesMap[item.list_id] ?? 0) + item.total_votes;
      if (!(item.list_id in newLeaderMap) && item.total_votes > 0) {
        newLeaderMap[item.list_id] = item.title;
      }
    }

    setTotalVotesMap(newTotalVotesMap);
    setLeaderMap(newLeaderMap);
    setVotedTodayIds((todayVotesResult.data ?? []).map((r) => r.list_id));
  }

  // Fetch fresh data on mount — catches votes made while navigating away
  useEffect(() => {
    refreshVoteData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stable Realtime subscription — created once on mount, never recreated
  useEffect(() => {
    const channel = supabase
      .channel("home-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "items" }, () => {
        refreshVoteData();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "votes" }, () => {
        refreshVoteData();
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "votes" }, () => {
        refreshVoteData();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "lists" }, (payload) => {
        const updated = payload.new as List;
        setOrderedLists((prev) => prev.map((l) => l.id === updated.id ? { ...l, name: updated.name, emoji: updated.emoji } : l));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "list_members", filter: `user_id=eq.${userId}` }, (payload) => {
        const listId = (payload.old as { list_id: string }).list_id;
        setOrderedLists((prev) => prev.filter((l) => l.id !== listId));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty: subscription must be stable, refs keep values fresh

  // Fallback: refresh when returning to the tab
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") refreshVoteData();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Stable: uses refs

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const order: string[] = saved ? JSON.parse(saved) : [];
      setOrderedLists(applyOrder(lists, order));
    } catch {
      setOrderedLists(lists);
    }
  }, [lists]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrderedLists((prev) => {
      const oldIndex = prev.findIndex((l) => l.id === active.id);
      const newIndex = prev.findIndex((l) => l.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next.map((l) => l.id))
      );
      return next;
    });
  }

  function toggleSortMode() {
    setSortMode((prev) => !prev);
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "Georgia, serif", color: "#c8a96e" }}
          >
            RankIt
          </h1>
          <p className="text-muted text-sm mt-1">Tus listas</p>
        </div>

        {orderedLists.length > 0 && (
          <button
            onClick={toggleSortMode}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors active:scale-90 active:transition-none ${
              sortMode
                ? "text-bg"
                : "bg-surface border border-border text-muted hover:text-text"
            }`}
            style={sortMode ? { backgroundColor: "#c8a96e" } : {}}
            aria-label={sortMode ? "Confirmar orden" : "Reordenar listas"}
          >
            {sortMode ? <Check size={18} /> : <ArrowUpDown size={16} />}
          </button>
        )}
      </div>

      {/* Lists */}
      {orderedLists.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🎬</p>
          <p className="text-muted text-base">Aún no tienes listas.</p>
          <p className="text-muted text-sm mt-1">
            Pulsa el <span className="text-gold font-bold">+</span> para crear
            la primera.
          </p>
        </div>
      ) : sortMode ? (
        <>
          <p className="text-muted text-xs text-center mb-4">
            Arrastra para cambiar el orden
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedLists.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-4">
                {orderedLists.map((list) => (
                  <SortableListCard
                    key={list.id}
                    list={list}
                    sharingLabel={sharingMap[list.id] ?? "Privado"}
                    totalVotes={totalVotesMap[list.id] ?? 0}
                    votedToday={votedTodaySet.has(list.id)}
                    leader={leaderMap[list.id] ?? null}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      ) : (
        <div className="flex flex-col gap-4">
          {orderedLists.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              sharingLabel={sharingMap[list.id] ?? "Privado"}
              totalVotes={totalVotesMap[list.id] ?? 0}
              votedToday={votedTodaySet.has(list.id)}
              leader={leaderMap[list.id] ?? null}
            />
          ))}
        </div>
      )}

      <CreateListButton userId={userId} />
    </div>
  );
}
