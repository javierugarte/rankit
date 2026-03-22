"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Trash2, Plus } from "lucide-react";
import type { List } from "@/lib/supabase/types";
import { LIST_TYPE_OPTIONS, getService } from "@/lib/services";

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
  "🏆",
];

function isValidEmoji(str: string): boolean {
  if (!str.trim()) return false;
  try {
    const segments = [...new Intl.Segmenter().segment(str.trim())];
    if (segments.length !== 1) return false;
    return /\p{Emoji_Presentation}|\p{Extended_Pictographic}/u.test(str.trim());
  } catch {
    return false;
  }
}

interface Props {
  userId: string;
  onClose: () => void;
  onCreated: () => void;
  editList?: List;
  onUpdated?: (list: List) => void;
  onDelete?: () => void;
}

export default function CreateListModal({ userId, onClose, onCreated, editList, onUpdated, onDelete }: Props) {
  const initialEmoji = editList?.emoji ?? "🎬";
  const isInitialCustom = !EMOJI_OPTIONS.includes(initialEmoji);

  const [name, setName] = useState(editList?.name ?? "");
  const [emoji, setEmoji] = useState(initialEmoji);
  const [listType, setListType] = useState<string | null>(editList?.list_type ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(isInitialCustom);
  const [customValue, setCustomValue] = useState(isInitialCustom ? initialEmoji : "");
  const [customError, setCustomError] = useState(false);
  const customInputRef = useRef<HTMLInputElement>(null);

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
                  onClick={() => {
                    setEmoji(e);
                    setShowCustomInput(false);
                    setCustomValue("");
                    setCustomError(false);
                  }}
                  className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
                  style={{
                    backgroundColor:
                      emoji === e && !showCustomInput
                        ? "rgba(200, 169, 110, 0.2)"
                        : "#111117",
                    border:
                      emoji === e && !showCustomInput
                        ? "1px solid rgba(200, 169, 110, 0.5)"
                        : "1px solid #2a2a38",
                  }}
                >
                  {e}
                </button>
              ))}

              {/* Custom emoji button */}
              <button
                type="button"
                onClick={() => {
                  setShowCustomInput(true);
                  setTimeout(() => customInputRef.current?.focus(), 50);
                }}
                className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
                style={{
                  backgroundColor: showCustomInput
                    ? "rgba(200, 169, 110, 0.2)"
                    : "#111117",
                  border: showCustomInput
                    ? "1px solid rgba(200, 169, 110, 0.5)"
                    : "1px solid #2a2a38",
                }}
              >
                {showCustomInput && isValidEmoji(customValue) ? (
                  <span>{customValue}</span>
                ) : (
                  <Plus size={16} color={showCustomInput ? "#c8a96e" : "#8888a0"} />
                )}
              </button>
            </div>

            {/* Custom emoji input */}
            {showCustomInput && (
              <div className="mt-3">
                <input
                  ref={customInputRef}
                  type="text"
                  value={customValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomValue(val);
                    if (isValidEmoji(val)) {
                      setEmoji(val.trim());
                      setCustomError(false);
                    } else if (val.length > 0) {
                      setCustomError(true);
                    } else {
                      setCustomError(false);
                    }
                  }}
                  placeholder="Abre el teclado emoji 😀"
                  className="w-full bg-surface border rounded-xl px-4 py-3 text-text text-2xl text-center placeholder-muted focus:outline-none transition-colors"
                  style={{
                    borderColor: customError
                      ? "#ef4444"
                      : isValidEmoji(customValue)
                      ? "rgba(200, 169, 110, 0.5)"
                      : "#2a2a38",
                  }}
                />
                {customError && (
                  <p className="text-xs mt-1.5" style={{ color: "#ef4444" }}>
                    Escribe un único emoji válido
                  </p>
                )}
              </div>
            )}
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
            <div className="grid grid-cols-2 gap-2">
              {LIST_TYPE_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setListType(opt.value)}
                  className="py-2.5 rounded-xl text-sm font-medium transition-all border"
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
            {listType && (
              <p className="text-xs text-muted mt-1.5">
                Autocompletado con {getService(listType)?.apiLabel ?? listType} al añadir items.
              </p>
            )}
          </div>

          {error && (
            <p style={{ color: "#f87171", fontSize: "0.875rem" }}>{error}</p>
          )}

          {editList && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors"
              style={{ color: "#f87171", backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <Trash2 size={15} />
              Eliminar lista
            </button>
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
