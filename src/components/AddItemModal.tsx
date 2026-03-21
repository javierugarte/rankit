"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";
import type { Item } from "@/lib/supabase/types";

interface Props {
  listId: string;
  userId: string;
  onClose: () => void;
  onAdded: (item: Item) => void;
}

export default function AddItemModal({
  listId,
  userId,
  onClose,
  onAdded,
}: Props) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("items")
      .insert({
        list_id: listId,
        title: title.trim(),
        category: category.trim() || null,
        added_by: userId,
        total_votes: 0,
      })
      .select()
      .single();

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      onAdded(data);
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-surface-2 rounded-t-3xl p-6 border-t border-border" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
        {/* Handle */}
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-text">Añadir item</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-muted hover:text-text"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-xs text-muted mb-2 uppercase tracking-wider">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              placeholder="Breaking Bad, Tokio, Ramen Nakamura..."
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-2 uppercase tracking-wider">
              Categoría{" "}
              <span className="normal-case text-muted/60">(opcional)</span>
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Drama, Japón, Restaurante..."
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-border text-muted text-sm font-medium hover:text-text transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1 py-3 rounded-xl text-bg text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#c8a96e" }}
            >
              {loading ? "Añadiendo..." : "Añadir"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
