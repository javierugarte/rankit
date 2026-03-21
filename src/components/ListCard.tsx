import Link from "next/link";
import type { List } from "@/lib/supabase/types";

interface Props {
  list: List;
  sharingLabel: string;
  totalVotes: number;
  votedToday: boolean;
  leader: string | null;
}

export default function ListCard({
  list,
  sharingLabel,
  totalVotes,
  votedToday,
  leader,
}: Props) {
  const votesLabel =
    totalVotes === 1 ? "1 voto" : `${totalVotes} votos`;

  const bottomLine = [
    leader ? `🥇 ${leader}` : null,
    votedToday ? "✓ Votaste hoy" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link href={`/list/${list.id}`}>
      <div className="bg-surface border border-border rounded-2xl p-4 hover:border-gold/40 transition-colors active:scale-[0.98] active:transition-none">
        <div className="flex items-center gap-4">
          {/* Emoji */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
            style={{ backgroundColor: "rgba(200, 169, 110, 0.1)" }}
          >
            {list.emoji}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-text font-semibold text-base truncate">
              {list.name}
            </h3>
            <p className="text-muted text-sm mt-0.5">
              {sharingLabel}
              {" · "}
              {votesLabel}
            </p>
          </div>

          {/* Arrow */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="text-muted shrink-0"
          >
            <path
              d="M6 3l5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Bottom line: leader + voted */}
        {bottomLine && (
          <p
            className="text-xs mt-2 truncate"
            style={{ color: votedToday ? "#6bba6b" : "#8888a0" }}
          >
            {bottomLine}
          </p>
        )}
      </div>
    </Link>
  );
}
