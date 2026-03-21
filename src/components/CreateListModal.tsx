"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";

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
}

export default function CreateListModal({ userId, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎬");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    const { error } = await supabase.from("lists").insert({
      name: name.trim(),
      emoji,
      owner_id: userId,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      onCreated();
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
          <h2 className="text-lg font-semibold text-text">Nueva lista</h2>
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

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
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
              {loading ? "Creando..." : "Crear lista"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
