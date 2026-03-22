import Image from "next/image";
import type { Item } from "@/lib/supabase/types";
import { TMDB_POSTER_BASE } from "@/lib/services";

function parseDescription(value: string): { isUrl: true; href: string; label: string } | { isUrl: false } {
  try {
    const url = new URL(value.trim());
    const label = url.hostname.replace(/^www\./, "");
    return { isUrl: true, href: url.href, label };
  } catch {
    return { isUrl: false };
  }
}

interface Props {
  item: Item;
  rank: number;
  canVote: boolean;
  isVoted: boolean;
  onVote: () => void;
  onMarkDone: () => void;
  onEdit: () => void;
  isFirst: boolean;
}

export default function RankItem({
  item,
  rank,
  canVote,
  isVoted,
  onVote,
  onMarkDone,
  onEdit,
  isFirst,
}: Props) {
  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-4 transition-all"
      style={{
        backgroundColor: isFirst ? "rgba(200, 169, 110, 0.08)" : "#111117",
        border: isFirst
          ? "1px solid rgba(200, 169, 110, 0.3)"
          : "1px solid #2a2a38",
      }}
    >
      {/* Rank number */}
      <div className="shrink-0 w-8 text-center">
        {isFirst ? (
          <span className="text-xl">👑</span>
        ) : (
          <span
            className="text-sm font-bold"
            style={{ color: rank <= 3 ? "#c8a96e" : "#8888a0" }}
          >
            #{rank}
          </span>
        )}
      </div>

      {/* Poster */}
      {!!(item.external_data as Record<string, unknown> | null)?.poster_path && (
        <Image
          src={`${TMDB_POSTER_BASE}${(item.external_data as Record<string, unknown>).poster_path as string}`}
          alt={item.title}
          width={36}
          height={54}
          className="rounded object-cover shrink-0"
        />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
        <p className="text-text font-medium text-sm truncate">{item.title}</p>
        {item.category && (() => {
          const parsed = parseDescription(item.category);
          return parsed.isUrl ? (
            <a
              href={parsed.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs mt-0.5 truncate inline-flex hover:underline"
              style={{ color: "#c8a96e" }}
            >
              {parsed.label}
            </a>
          ) : (
            <p className="text-muted text-xs mt-0.5 truncate">{item.category}</p>
          );
        })()}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Mark done (only for #1) */}
        {isFirst && (
          <button
            onClick={onMarkDone}
            className="text-xs px-2 py-1 rounded-lg transition-colors text-muted hover:text-text"
            style={{ border: "1px solid #2a2a38" }}
            title="Marcar como visto"
          >
            ✓
          </button>
        )}

        {/* Vote button */}
        <button
          onClick={onVote}
          disabled={!canVote}
          className="w-10 rounded-xl flex flex-col items-center justify-center gap-0.5 py-2 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: isVoted
              ? "#c8a96e"
              : canVote
              ? "rgba(200, 169, 110, 0.15)"
              : "rgba(200, 169, 110, 0.05)",
            border: isVoted
              ? "none"
              : "1px solid rgba(200, 169, 110, 0.3)",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1l1.8 3.6L13 5.3l-3 2.9.7 4.1L7 10.2l-3.7 2.1.7-4.1-3-2.9 4.2-.7L7 1z"
              fill={isVoted ? "#0a0a0f" : "#c8a96e"}
            />
          </svg>
          <span
            className="text-[11px] font-semibold leading-none"
            style={{ color: isVoted ? "#0a0a0f" : "#c8a96e" }}
          >
            {item.total_votes}
          </span>
        </button>
      </div>
    </div>
  );
}
