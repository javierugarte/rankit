import { NextResponse } from "next/server";

type TmdbDetails = {
  vote_average?: number;
  vote_count?: number;
};

const CACHE_SECONDS = 86400;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ service: string; id: string }> }
) {
  const { service, id } = await params;
  const mediaType = service === "movies" ? "movie" : service === "tv" ? "tv" : null;

  if (!mediaType || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid media reference" }, { status: 404 });
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TMDB_API_KEY not configured" }, { status: 503 });
  }

  let response: Response;
  try {
    response = await fetch(
      `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${encodeURIComponent(apiKey)}`,
      { next: { revalidate: CACHE_SECONDS } }
    );
  } catch {
    return NextResponse.json({ error: "Unable to reach TMDB" }, { status: 502 });
  }

  if (!response.ok) {
    return NextResponse.json({ error: "TMDB title not found" }, { status: 404 });
  }

  const details = (await response.json()) as TmdbDetails;
  const voteAverage = details.vote_average;
  const rating =
    typeof voteAverage === "number" &&
    Number.isFinite(voteAverage) &&
    voteAverage >= 0 &&
    voteAverage <= 10 &&
    (details.vote_count ?? 0) > 0
      ? voteAverage
      : null;

  return NextResponse.json(
    { rating },
    {
      headers: {
        "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=604800`,
      },
    }
  );
}
