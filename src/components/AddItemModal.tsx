"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Trash2 } from "lucide-react";
import type { Item } from "@/lib/supabase/types";

interface Props {
  listId: string;
  userId: string;
  onClose: () => void;
  onSaved: (item: Item) => void;
  editItem?: Item;
  onDelete?: () => void;
}

export default function AddItemModal({
  listId,
  userId,
  onClose,
  onSaved,
  editItem,
  onDelete,
}: Props) {
  const [title, setTitle] = useState(editItem?.title ?? "");
  const [category, setCategory] = useState(editItem?.category ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);

    if (editItem) {
      const { data, error } = await supabase
        .from("items")
        .update({
          title: title.trim(),
          category: category.trim() || null,
        })
        .eq("id", editItem.id)
        .select()
        .single();

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        onSaved(data);
        onClose();
      }
    } else {
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
        onSaved(data);
        onClose();
      }
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
          <h2 className="text-lg font-semibold text-text">{editItem ? "Editar item" : "Añadir item"}</h2>
          <div className="flex items-center gap-2">
            {editItem && onDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                title="Eliminar item"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-muted hover:text-text"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {confirmDelete && (
          <div className="mb-4 p-4 rounded-xl border" style={{ backgroundColor: "rgba(239, 68, 68, 0.08)", borderColor: "rgba(239, 68, 68, 0.3)" }}>
            <p className="text-sm text-text mb-3">¿Eliminar este ítem? Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2 rounded-lg border border-border text-muted text-sm hover:text-text transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: "#ef4444" }}
              >
                Eliminar
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              {loading ? (editItem ? "Guardando..." : "Añadiendo...") : editItem ? "Guardar" : "Añadir"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
