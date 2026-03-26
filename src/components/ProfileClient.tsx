"use client";

import { useState } from "react";
import Image from "next/image";
import { Pencil } from "lucide-react";
import LogoutButton from "./LogoutButton";
import EditProfileModal from "./EditProfileModal";
import type { Profile } from "@/lib/supabase/types";

interface Props {
  profile: Profile | null;
  userId: string;
  email: string;
  totalLists: number;
  totalVotes: number;
  totalCompleted: number;
  sharedLists: number;
}

export default function ProfileClient({
  profile,
  userId,
  email,
  totalLists,
  totalVotes,
  totalCompleted,
  sharedLists,
}: Props) {
  const [username, setUsername] = useState(profile?.username ?? "Usuario");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    profile?.avatar_url ?? null
  );
  const [showEditModal, setShowEditModal] = useState(false);

  const initials = username.slice(0, 2).toUpperCase();

  const stats = [
    { value: totalLists, label: "Listas creadas" },
    { value: totalVotes, label: "Votos emitidos" },
    { value: totalCompleted, label: "Ítems vistos" },
    { value: sharedLists, label: "Listas compartidas" },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-semibold text-text">Perfil</h2>
        <button
          onClick={() => setShowEditModal(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors text-muted hover:text-text hover:bg-surface active:scale-90 active:transition-none"
          aria-label="Editar perfil"
        >
          <Pencil size={16} />
        </button>
      </div>

      {/* Avatar + Name */}
      <div className="flex flex-col items-center mb-10">
        <button
          onClick={() => setShowEditModal(true)}
          className="relative w-20 h-20 rounded-full overflow-hidden mb-4 transition-transform active:scale-95 active:transition-none"
          aria-label="Editar foto de perfil"
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={username}
              fill
              className="object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-2xl font-bold"
              style={{ backgroundColor: "#c8a96e", color: "#0a0a0f" }}
            >
              {initials}
            </div>
          )}
        </button>
        <h3 className="text-xl font-semibold text-text">{username}</h3>
        <p className="text-muted text-sm mt-1">{email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {stats.map(({ value, label }) => (
          <div
            key={label}
            className="bg-surface border border-border rounded-xl p-4 text-center"
          >
            <p
              className="text-3xl font-bold"
              style={{ color: "#c8a96e", fontFamily: "Georgia, serif" }}
            >
              {value}
            </p>
            <p className="text-muted text-sm mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <LogoutButton />
      </div>

      {showEditModal && (
        <EditProfileModal
          userId={userId}
          currentUsername={username}
          currentAvatarUrl={avatarUrl}
          onClose={() => setShowEditModal(false)}
          onSaved={(newUsername, newAvatarUrl) => {
            setUsername(newUsername);
            setAvatarUrl(
              newAvatarUrl ? `${newAvatarUrl}?t=${Date.now()}` : null
            );
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
}
