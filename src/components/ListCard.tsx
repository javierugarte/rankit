"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { List } from "@/lib/supabase/types";

interface Props {
  list: List;
  itemCount: number;
  isOwner?: boolean;
}

export default function ListCard({ list, itemCount, isOwner }: Props) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("lists").delete().eq("id", list.id);
    setDeleting(false);
    setShowConfirm(false);
    router.refresh();
  }

  return (
    <>
      <div className="relative flex items-center">
        <Link href={`/list/${list.id}`} className="flex-1 min-w-0">
          <div className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-gold/40 transition-colors active:scale-[0.98] active:transition-none">
            {/* Emoji */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ backgroundColor: "rgba(200, 169, 110, 0.1)" }}
            >
              {list.emoji}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-text font-semibold text-base truncate">
                {list.name}
              </h3>
              <p className="text-muted text-sm mt-0.5">
                {itemCount === 0
                  ? "Sin items pendientes"
                  : `${itemCount} item${itemCount !== 1 ? "s" : ""} pendiente${
                      itemCount !== 1 ? "s" : ""
                    }`}
              </p>
            </div>

            {/* Arrow */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="text-muted shrink-0"
            >
              <path
                d="M6 3l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </Link>

        {isOwner && (
          <button
            onClick={() => setShowConfirm(true)}
            className="ml-2 w-9 h-9 rounded-xl flex items-center justify-center text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
            aria-label="Eliminar lista"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        )}
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={(e) => e.target === e.currentTarget && setShowConfirm(false)}
        >
          <div
            className="w-full max-w-lg bg-surface-2 rounded-t-3xl p-6 border-t border-border"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
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
                onClick={() => setShowConfirm(false)}
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
    </>
  );
}
