"use client";

import { useState } from "react";
import { X, UserPlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export interface MemberWithProfile {
  user_id: string;
  username: string;
}

interface Props {
  listId: string;
  members: MemberWithProfile[];
  onClose: () => void;
  onMembersChange: (members: MemberWithProfile[]) => void;
}

export default function ShareModal({
  listId,
  members,
  onClose,
  onMembersChange,
}: Props) {
  const [email, setEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [foundUser, setFoundUser] = useState<{
    id: string;
    username: string;
  } | null>(null);

  const supabase = createClient();

  async function handleSearch() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setSearching(true);
    setError("");
    setSuccess("");
    setFoundUser(null);

    const { data, error: rpcError } = await supabase.rpc(
      "get_profile_by_email",
      { lookup_email: trimmed }
    );

    setSearching(false);

    if (rpcError || !data || data.length === 0) {
      setError("No se encontró ningún usuario con ese email");
      return;
    }

    const user = data[0] as { id: string; username: string };

    if (members.some((m) => m.user_id === user.id)) {
      setError("Este usuario ya es colaborador");
      return;
    }

    setFoundUser(user);
  }

  async function handleAdd() {
    if (!foundUser) return;
    setAdding(true);
    setError("");

    const { error: insertError } = await supabase
      .from("list_members")
      .insert({ list_id: listId, user_id: foundUser.id });

    setAdding(false);

    if (insertError) {
      setError("Error al añadir colaborador");
      return;
    }

    onMembersChange([
      ...members,
      { user_id: foundUser.id, username: foundUser.username },
    ]);
    setFoundUser(null);
    setEmail("");
    setSuccess(`${foundUser.username} añadido como colaborador`);
  }

  async function handleRemove(userId: string) {
    setRemovingId(userId);
    await supabase
      .from("list_members")
      .delete()
      .eq("list_id", listId)
      .eq("user_id", userId);
    setRemovingId(null);
    onMembersChange(members.filter((m) => m.user_id !== userId));
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg bg-surface-2 rounded-t-3xl border-t border-border"
        style={{
          paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="p-6">
          <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />

          <h2 className="text-lg font-semibold text-text mb-5">
            Compartir lista
          </h2>

          {/* Current collaborators */}
          {members.length > 0 && (
            <div className="mb-5">
              <p className="text-xs text-muted uppercase tracking-wide mb-2">
                Colaboradores
              </p>
              <div className="space-y-2">
                {members.map((m) => (
                  <div
                    key={m.user_id}
                    className="flex items-center justify-between py-2 px-3 bg-surface rounded-xl border border-border"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                        style={{
                          backgroundColor: "rgba(200, 169, 110, 0.2)",
                          color: "#c8a96e",
                        }}
                      >
                        {m.username[0].toUpperCase()}
                      </div>
                      <span className="text-text text-sm">{m.username}</span>
                    </div>
                    <button
                      onClick={() => handleRemove(m.user_id)}
                      disabled={removingId === m.user_id}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
                      aria-label="Eliminar colaborador"
                    >
                      {removingId === m.user_id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <X size={13} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add collaborator */}
          <p className="text-xs text-muted uppercase tracking-wide mb-2">
            Añadir colaborador
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
                setSuccess("");
                setFoundUser(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="email@ejemplo.com"
              className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-base text-text placeholder:text-muted focus:outline-none focus:border-gold/50"
            />
            <button
              onClick={handleSearch}
              disabled={searching || !email.trim()}
              className="px-4 py-2.5 rounded-xl text-sm font-medium transition-opacity disabled:opacity-50 shrink-0"
              style={{
                backgroundColor: "rgba(200, 169, 110, 0.15)",
                color: "#c8a96e",
              }}
            >
              {searching ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Buscar"
              )}
            </button>
          </div>

          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          {success && (
            <p className="text-xs mt-2" style={{ color: "#c8a96e" }}>
              ✓ {success}
            </p>
          )}

          {/* Found user preview */}
          {foundUser && (
            <div
              className="mt-3 flex items-center justify-between py-2 px-3 rounded-xl border"
              style={{
                backgroundColor: "rgba(200, 169, 110, 0.06)",
                borderColor: "rgba(200, 169, 110, 0.3)",
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{
                    backgroundColor: "rgba(200, 169, 110, 0.2)",
                    color: "#c8a96e",
                  }}
                >
                  {foundUser.username[0].toUpperCase()}
                </div>
                <span className="text-text text-sm">{foundUser.username}</span>
              </div>
              <button
                onClick={handleAdd}
                disabled={adding}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-50"
                style={{
                  backgroundColor: "rgba(200, 169, 110, 0.2)",
                  color: "#c8a96e",
                }}
              >
                {adding ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <>
                    <UserPlus size={12} />
                    <span>Añadir</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
