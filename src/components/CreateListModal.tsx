"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";
import type { List } from "@/lib/supabase/types";
import { LIST_TYPE_OPTIONS } from "@/lib/services";

const EMOJI_OPTIONS = [
  "🎬",
  "📺",
  "🎮",
  "📚",
  "✈️",
  "🍕",
  "🎵",
  "🏃",
  "🌍",
  "🎯",
  "🍜",
  "💡",
];

interface Props {
  userId: string;
  onClose: () => void;
  onCreated: () => void;
  editList?: List;
  onUpdated?: (list: List) => void;
}

export default function CreateListModal({ userId, onClose, onCreated, editList, onUpdated }: Props) {
  const [name, setName] = useState(editList?.name ?? "");
  const [emoji, setEmoji] = useState(editList?.emoji ?? "🎬");
  const [listType, setListType] = useState<string | null>(editList?.list_type ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    if (editList) {
      const { data, error } = await supabase
        .from("lists")
        .update({ name: name.trim(), emoji, list_type: listType })
        .eq("id", editList.id)
        .select()
        .single();

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        onUpdated?.(data);
        onClose();
      }
    } else {
      const { data, error } = await supabase.from("lists").insert({
        name: name.trim(),
        emoji,
        list_type: listType,
        owner_id: userId,
      }).select();

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        onCreated();
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
          <h2 className="text-lg font-semibold text-text">{editList ? "Editar lista" : "Nueva lista"}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-muted hover:text-text"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-5">
          {/* Emoji picker */}
          <div>
            <label className="block text-xs text-muted mb-2 uppercase tracking-wider">
              Icono
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
                  style={{
                    backgroundColor:
                      emoji === e
                        ? "rgba(200, 169, 110, 0.2)"
                        : "#111117",
                    border:
                      emoji === e
                        ? "1px solid rgba(200, 169, 110, 0.5)"
                        : "1px solid #2a2a38",
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs text-muted mb-2 uppercase tracking-wider">
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Series pendientes, Viajes, Restaurantes..."
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          {/* List type / service */}
          <div>
            <label className="block text-xs text-muted mb-2 uppercase tracking-wider">
              Tipo de contenido{" "}
              <span className="normal-case text-muted/60">(opcional)</span>
            </label>
            <div className="flex gap-2">
              {LIST_TYPE_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setListType(opt.value)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border"
                  style={{
                    backgroundColor:
                      listType === opt.value
                        ? "rgba(200, 169, 110, 0.15)"
                        : "#111117",
                    borderColor:
                      listType === opt.value
                        ? "rgba(200, 169, 110, 0.5)"
                        : "#2a2a38",
                    color: listType === opt.value ? "#c8a96e" : "#8888a0",
                  }}
                >
                  {opt.emoji !== "—" && <span className="mr-1">{opt.emoji}</span>}
                  {opt.label}
                </button>
              ))}
            </div>
            {listType && listType !== null && (
              <p className="text-xs text-muted mt-1.5">
                Autocomplete con TMDB al anadir items.
              </p>
            )}
          </div>

          {error && (
            <p style={{ color: "#f87171", fontSize: "0.875rem" }}>{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-border text-muted text-sm font-medium hover:text-text transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 py-3 rounded-xl text-bg text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#c8a96e" }}
            >
              {loading ? (editList ? "Guardando..." : "Creando...") : editList ? "Guardar" : "Crear lista"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
