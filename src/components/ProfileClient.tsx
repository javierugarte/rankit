"use client";

import { useState } from "react";
import Image from "next/image";
import { LayoutList, Star, CheckCheck, Users } from "lucide-react";
import LogoutButton from "./LogoutButton";
import EditProfileModal from "./EditProfileModal";
import type { Profile } from "@/lib/supabase/types";

interface Props {
  profile: Profile | null;
  userId: string;
  email: string;
  createdAt?: string | null;
  totalLists: number;
  totalVotes: number;
  totalCompleted: number;
  sharedLists: number;
}

export default function ProfileClient({
  profile,
  userId,
  email,
  createdAt,
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

  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString("es-ES", { month: "long", year: "numeric" })
    : null;

  const stats = [
    { value: totalLists, label: "Listas creadas", Icon: LayoutList },
    { value: totalVotes, label: "Votos emitidos", Icon: Star },
    { value: totalCompleted, label: "Ítems vistos", Icon: CheckCheck },
    { value: sharedLists, label: "Listas compartidas", Icon: Users },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-semibold text-text">Perfil</h2>
      </div>

      {/* Avatar + Name */}
      <div className="flex flex-col items-center mb-10">
        <button
          onClick={() => setShowEditModal(true)}
          className="relative w-20 h-20 rounded-full overflow-hidden mb-4 ring-2 ring-[#c8a96e] shadow-[0_0_14px_rgba(200,169,110,0.35)] transition-transform active:scale-95 active:transition-none"
          aria-label="Editar foto de perfil"
        >
          <div
            className="absolute inset-0 flex items-center justify-center text-2xl font-bold"
            style={{ backgroundColor: "#c8a96e", color: "#0a0a0f" }}
          >
            {initials}
          </div>
          {avatarUrl && (
            <Image
              src={avatarUrl}
              alt={username}
              fill
              className="object-cover"
            />
          )}
        </button>
        <h3 className="text-xl font-semibold text-text">{username}</h3>
        <button
          onClick={() => setShowEditModal(true)}
          className="mt-2 px-3 py-1 rounded-full text-xs font-medium border border-[#c8a96e]/40 text-[#c8a96e] hover:bg-[#c8a96e]/10 transition-colors active:scale-95 active:transition-none"
        >
          Editar perfil
        </button>
        {memberSince && (
          <p className="text-xs mt-3" style={{ color: "rgba(160,160,180,0.6)" }}>
            Miembro desde {memberSince}
          </p>
        )}
        <p className="text-xs mt-0.5" style={{ color: "rgba(160,160,180,0.5)" }}>
          {email}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {stats.map(({ value, label, Icon }) => (
          <div
            key={label}
            className="bg-surface border border-border rounded-xl p-4 text-center"
          >
            <Icon size={20} className="mx-auto mb-2" style={{ color: "#c8a96e" }} />
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
