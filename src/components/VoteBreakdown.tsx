"use client";

import { useState } from "react";
import Image from "next/image";
import type { MemberWithProfile } from "./ShareModal";
import { useTranslations } from "next-intl";

const COLORS = [
  "#e05c5c",
  "#5cb0e0",
  "#5ce0a0",
  "#a05ce0",
  "#e0875c",
  "#e05cb0",
  "#5ce0e0",
  "#c8e05c",
];

export function userColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return COLORS[hash % COLORS.length];
}

interface Props {
  participants: MemberWithProfile[];
  votesByUser: Record<string, number>;
  currentUserId: string;
}

export default function VoteBreakdown({ participants, votesByUser, currentUserId }: Props) {
  const [highlightedUserId, setHighlightedUserId] = useState<string | null>(null);
  const t = useTranslations("voteBreakdown");

  const totalVotes = participants.reduce((sum, p) => sum + (votesByUser[p.user_id] ?? 0), 0);

  const segments = participants
    .map((p) => ({ ...p, votes: votesByUser[p.user_id] ?? 0, color: userColor(p.user_id) }))
    .filter((p) => p.votes > 0)
    .sort((a, b) => b.votes - a.votes);

  function handleAvatarTap(userId: string) {
    setHighlightedUserId((prev) => (prev === userId ? null : userId));
  }

  function handleSegmentTap(userId: string) {
    setHighlightedUserId((prev) => (prev === userId ? null : userId));
  }

  return (
    <div className="pt-4" style={{ borderTop: "1px solid #2a2a38" }}>
      {/* Avatars row — centered */}
      <div className="flex justify-center gap-4 mb-4 flex-wrap">
        {participants.map((p) => {
          const color = userColor(p.user_id);
          const isHighlighted = highlightedUserId === p.user_id;
          const votes = votesByUser[p.user_id] ?? 0;
          const isYou = p.user_id === currentUserId;

          return (
            <button
              key={p.user_id}
              onClick={() => handleAvatarTap(p.user_id)}
              className="flex flex-col items-center gap-1.5"
              style={{
                opacity: highlightedUserId && !isHighlighted ? 0.4 : 1,
                transition: "opacity 0.2s ease",
              }}
            >
              {/* Avatar */}
              <div
                className="relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold"
                style={{
                  border: `2px solid ${color}`,
                  backgroundColor: "rgba(255,255,255,0.04)",
                  boxShadow: isHighlighted ? `0 0 10px ${color}70` : "none",
                  transform: isHighlighted ? "scale(1.15)" : "scale(1)",
                  transition: "box-shadow 0.2s ease, transform 0.2s ease",
                }}
              >
                {p.avatar_url ? (
                  <Image src={p.avatar_url} alt={p.username} fill className="object-cover" />
                ) : (
                  <span style={{ color }}>{p.username[0].toUpperCase()}</span>
                )}
                {isYou && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center bg-bg"
                    style={{ fontSize: 8, border: `1px solid ${color}`, color }}
                  >
                    ★
                  </span>
                )}
              </div>

              {/* Name + votes */}
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] text-muted leading-none">
                  {isYou ? t("you") : p.username}
                </span>
                <span
                  className="text-xs font-semibold leading-none"
                  style={{ color }}
                >
                  {votes} {votes === 1 ? t("vote") : t("votes")}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Progress bar */}
      {totalVotes === 0 ? (
        <div className="h-2.5 rounded-full" style={{ backgroundColor: "#2a2a38" }} />
      ) : (
        <div className="flex rounded-full overflow-hidden h-2.5 gap-px">
          {segments.map((p) => (
            <button
              key={p.user_id}
              onClick={() => handleSegmentTap(p.user_id)}
              className="h-full"
              style={{
                width: `${(p.votes / totalVotes) * 100}%`,
                backgroundColor: p.color,
                opacity: highlightedUserId && highlightedUserId !== p.user_id ? 0.2 : 1,
                transition: "opacity 0.2s ease, width 0.4s ease",
                minWidth: 6,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
