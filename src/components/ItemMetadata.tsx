"use client";

import TmdbRating from "./TmdbRating";

interface Props {
  category: string | null;
  externalData: Record<string, unknown> | null;
  externalId: string | null;
  listType?: string | null;
  onRatingLoaded?: (externalId: string, rating: number) => void;
}

function parseDescription(value: string): { href: string; label: string } | null {
  try {
    const url = new URL(value.trim());
    return { href: url.href, label: url.hostname.replace(/^www\./, "") };
  } catch {
    return null;
  }
}

export default function ItemMetadata({
  category,
  externalData,
  externalId,
  listType,
  onRatingLoaded,
}: Props) {
  const hasTmdbRating = listType === "movies" || listType === "tv";
  if (!category && !hasTmdbRating) return null;

  const description = category ? parseDescription(category) : null;

  return (
    <div className="mt-0.5 flex min-w-0 items-center gap-2">
      {description ? (
        <a
          href={description.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="min-w-0 truncate text-xs hover:underline"
          style={{ color: "#c8a96e" }}
        >
          {description.label}
        </a>
      ) : category ? (
        <p className="min-w-0 truncate text-xs text-muted">{category}</p>
      ) : null}
      {hasTmdbRating && (
        <TmdbRating
          key={`${listType}:${externalId ?? ""}`}
          externalId={externalId}
          initialRating={externalData?.tmdb_rating}
          listType={listType}
          onRatingLoaded={onRatingLoaded}
        />
      )}
    </div>
  );
}
