"use client";

import { useState } from "react";
import Image from "next/image";
import type { MemberWithProfile } from "./ShareModal";

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
  const [activeChipUserId, setActiveChipUserId] = useState<string | null>(null);

  const totalVotes = participants.reduce((sum, p) => sum + (votesByUser[p.user_id] ?? 0), 0);

  const segments = participants
    .map((p) => ({ ...p, votes: votesByUser[p.user_id] ?? 0, color: userColor(p.user_id) }))
    .filter((p) => p.votes > 0)
    .sort((a, b) => b.votes - a.votes);

  function handleAvatarTap(userId: string) {
    if (activeChipUserId === userId) {
      setActiveChipUserId(null);
    } else {
      setActiveChipUserId(userId);
      setHighlightedUserId(userId);
      setTimeout(() => setHighlightedUserId(null), 600);
    }
  }

  function handleSegmentTap(userId: string) {
    setHighlightedUserId(userId);
    setActiveChipUserId(userId);
    setTimeout(() => {
      setHighlightedUserId(null);
      setActiveChipUserId(null);
    }, 800);
  }

  return (
    <div className="mt-3 pt-3" style={{ borderTop: "1px solid #2a2a38" }}>
      {/* Avatars row */}
      <div className="flex gap-2 mb-2 flex-wrap">
        {participants.map((p) => {
          const color = userColor(p.user_id);
          const isHighlighted = highlightedUserId === p.user_id;
          const isActive = activeChipUserId === p.user_id;
          const votes = votesByUser[p.user_id] ?? 0;
          const isYou = p.user_id === currentUserId;

          return (
            <div key={p.user_id} className="relative flex flex-col items-center">
              <button
                onClick={() => handleAvatarTap(p.user_id)}
                className="relative w-7 h-7 rounded-full"
                style={{
                  transform: isHighlighted ? "scale(1.25)" : "scale(1)",
                  transition: "transform 0.2s ease",
                }}
              >
                <div
                  className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold relative"
                  style={{
                    border: `2px solid ${color}`,
                    backgroundColor: "rgba(255,255,255,0.04)",
                    boxShadow: isHighlighted ? `0 0 8px ${color}80` : "none",
                    transition: "box-shadow 0.2s ease",
                  }}
                >
                  {p.avatar_url ? (
                    <Image src={p.avatar_url} alt={p.username} fill className="object-cover" />
                  ) : (
                    <span style={{ color }}>{p.username[0].toUpperCase()}</span>
                  )}
                </div>
                {isYou && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center bg-bg"
                    style={{ fontSize: 7, border: `1px solid ${color}`, color }}
                  >
                    ★
                  </span>
                )}
              </button>

              {/* Chip on tap */}
              {isActive && (
                <div
                  className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-lg text-[10px] whitespace-nowrap z-10 pointer-events-none"
                  style={{
                    backgroundColor: `${color}18`,
                    border: `1px solid ${color}60`,
                    color,
                  }}
                >
                  {isYou ? "Tú" : p.username} · {votes} voto{votes !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      {totalVotes === 0 ? (
        <div
          className="h-1 rounded-full text-[9px] flex items-center justify-center"
          style={{ backgroundColor: "#2a2a38" }}
        />
      ) : (
        <div className="flex rounded-full overflow-hidden h-1 gap-px">
          {segments.map((p) => (
            <button
              key={p.user_id}
              onClick={() => handleSegmentTap(p.user_id)}
              className="h-full"
              style={{
                width: `${(p.votes / totalVotes) * 100}%`,
                backgroundColor: p.color,
                opacity:
                  highlightedUserId && highlightedUserId !== p.user_id ? 0.25 : 1,
                transition: "opacity 0.2s ease, width 0.4s ease",
                minWidth: 4,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
