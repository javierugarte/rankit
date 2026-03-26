"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Loader2, Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  userId: string;
  currentUsername: string;
  currentAvatarUrl: string | null;
  onClose: () => void;
  onSaved: (username: string, avatarUrl: string | null) => void;
}

export default function EditProfileModal({
  userId,
  currentUsername,
  currentAvatarUrl,
  onClose,
  onSaved,
}: Props) {
  const [username, setUsername] = useState(currentUsername);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const displayAvatar = avatarPreview ?? currentAvatarUrl;
  const initials = (username || currentUsername).slice(0, 2).toUpperCase();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no puede superar 5 MB");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError("");
  }

  async function handleSave() {
    const trimmed = username.trim();
    if (trimmed.length < 3) {
      setError("El nombre de usuario debe tener al menos 3 caracteres");
      return;
    }
    if (/\s/.test(trimmed)) {
      setError("El nombre de usuario no puede contener espacios");
      return;
    }

    setSaving(true);
    setError("");

    let newAvatarUrl = currentAvatarUrl;

    if (avatarFile) {
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(`${userId}/avatar`, avatarFile, {
          upsert: true,
          contentType: avatarFile.type,
        });

      if (uploadError) {
        setError("Error al subir la imagen");
        setSaving(false);
        return;
      }

      newAvatarUrl = supabase.storage
        .from("avatars")
        .getPublicUrl(`${userId}/avatar`).data.publicUrl;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ username: trimmed, avatar_url: newAvatarUrl })
      .eq("id", userId);

    setSaving(false);

    if (updateError) {
      if (updateError.code === "23505") {
        setError("Ese nombre de usuario ya está en uso");
      } else {
        setError("Error al guardar los cambios");
      }
      return;
    }

    onSaved(trimmed, newAvatarUrl);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg bg-surface-2 rounded-t-3xl border-t border-border"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="p-6">
          <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />
          <h2 className="text-lg font-semibold text-text mb-6">Editar perfil</h2>

          {/* Avatar picker */}
          <div className="flex justify-center mb-6">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative w-20 h-20 rounded-full overflow-hidden transition-transform active:scale-95 active:transition-none"
              aria-label="Cambiar foto de perfil"
            >
              {displayAvatar ? (
                <Image
                  src={displayAvatar}
                  alt="Avatar"
                  fill
                  className="object-cover"
                  unoptimized={!!avatarPreview}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-2xl font-bold"
                  style={{ backgroundColor: "#c8a96e", color: "#0a0a0f" }}
                >
                  {initials}
                </div>
              )}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
              >
                <Camera size={20} color="white" />
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Username */}
          <div className="mb-5">
            <label className="text-xs text-muted uppercase tracking-wide mb-2 block">
              Nombre de usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError("");
              }}
              placeholder="tunombredeusuario"
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text placeholder:text-muted focus:outline-none focus:border-gold/50"
              autoCorrect="off"
              autoCapitalize="none"
            />
          </div>

          {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

          {/* Actions */}
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
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Guardar"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
