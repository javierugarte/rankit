import Link from "next/link";
import type { List } from "@/lib/supabase/types";

interface Props {
  list: List;
  itemCount: number;
}

export default function ListCard({ list, itemCount }: Props) {
  return (
    <Link href={`/list/${list.id}`}>
      <div className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-gold/40 transition-colors active:scale-[0.98] active:transition-none">
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
            {itemCount === 0
              ? "Sin items pendientes"
              : `${itemCount} item${itemCount !== 1 ? "s" : ""} pendiente${
                  itemCount !== 1 ? "s" : ""
                }`}
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
    </Link>
  );
}
