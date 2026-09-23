"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type RatingResponse = {
  rating: number | null;
};

interface Props {
  externalId: string | null;
  initialRating?: unknown;
  listType?: string | null;
  onRatingLoaded?: (externalId: string, rating: number) => void;
}

const ratingRequests = new Map<string, Promise<number | null>>();

function parseRating(value: unknown): number | null {
  if (typeof value !== "number" && (typeof value !== "string" || value.trim() === "")) {
    return null;
  }

  const rating = Number(value);
  return Number.isFinite(rating) && rating >= 0 && rating <= 10 ? rating : null;
}

function fetchRating(listType: string, externalId: string): Promise<number | null> {
  const key = `${listType}:${externalId}`;
  const cachedRequest = ratingRequests.get(key);
  if (cachedRequest) return cachedRequest;

  const request = fetch(
    `/api/ratings/tmdb/${encodeURIComponent(listType)}/${encodeURIComponent(externalId)}`
  )
    .then(async (response) => {
      if (!response.ok) return null;
      const data = (await response.json()) as RatingResponse;
      return parseRating(data.rating);
    })
    .catch(() => null);

  ratingRequests.set(key, request);
  return request;
}

export default function TmdbRating({
  externalId,
  initialRating,
  listType,
  onRatingLoaded,
}: Props) {
  const [rating, setRating] = useState(() => parseRating(initialRating));
  const t = useTranslations("listDetail");

  useEffect(() => {
    if ((listType !== "movies" && listType !== "tv") || !externalId || rating !== null) {
      return;
    }

    let active = true;
    void fetchRating(listType, externalId).then((nextRating) => {
      if (!active) return;
      setRating(nextRating);
      if (nextRating !== null) onRatingLoaded?.(externalId, nextRating);
    });

    return () => {
      active = false;
    };
  }, [externalId, listType, onRatingLoaded, rating]);

  if (rating === null) return null;

  const formattedRating = rating.toFixed(1);
  const label = t("tmdbRating", { rating: formattedRating });

  return (
    <span
      className="shrink-0 text-[11px] font-semibold text-muted"
      aria-label={label}
      title={label}
    >
      {formattedRating}
    </span>
  );
}
