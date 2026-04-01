"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  email: string;
  onClose: () => void;
}

export default function ChangePasswordModal({ email, onClose }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  async function handleSave() {
    if (newPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setSaving(true);
    setError("");

    // Verify current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (signInError) {
      setError("La contraseña actual es incorrecta");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setSaving(false);

    if (updateError) {
      setError("Error al cambiar la contraseña");
      return;
    }

    setSuccess(true);
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg bg-surface-2 rounded-t-3xl border-t border-border"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="p-6">
          <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />
          <h2 className="text-lg font-semibold text-text mb-6">
            Cambiar contraseña
          </h2>

          {success ? (
            <div className="text-center py-4">
              <p className="text-text font-medium mb-1">¡Contraseña actualizada!</p>
              <p className="text-muted text-sm mb-6">Tu contraseña ha sido cambiada correctamente.</p>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: "#c8a96e", color: "#0a0a0f" }}
              >
                Cerrar
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-5">
                <div>
                  <label className="text-xs text-muted uppercase tracking-wide mb-2 block">
                    Contraseña actual
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => { setCurrentPassword(e.target.value); setError(""); }}
                    placeholder="••••••••"
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-base text-text placeholder:text-muted focus:outline-none focus:border-gold/50"
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted uppercase tracking-wide mb-2 block">
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                    placeholder="••••••••"
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-base text-text placeholder:text-muted focus:outline-none focus:border-gold/50"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted uppercase tracking-wide mb-2 block">
                    Confirmar nueva contraseña
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                    placeholder="••••••••"
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-base text-text placeholder:text-muted focus:outline-none focus:border-gold/50"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl border border-border text-muted text-sm font-medium hover:text-text transition-colors disabled:opacity-50 active:scale-[0.97] active:transition-none"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.97] active:transition-none"
                  style={{ backgroundColor: "#c8a96e", color: "#0a0a0f" }}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : "Guardar"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
