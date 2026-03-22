import { NextRequest, NextResponse } from "next/server";
import type { ExternalResult } from "@/lib/services";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ service: string }> }
) {
  const { service } = await params;
  const q = req.nextUrl.searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return NextResponse.json([]);
  }

  if (service === "movies") {
    return searchTMDB(q.trim());
  }

  return NextResponse.json({ error: "Unknown service" }, { status: 400 });
}

async function searchTMDB(query: string): Promise<NextResponse> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "TMDB_API_KEY not configured" },
      { status: 500 }
    );
  }

  const url = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(query)}&api_key=${apiKey}&language=es-ES&page=1`;

  let res: Response;
  try {
    res = await fetch(url, { next: { revalidate: 60 } });
  } catch {
    return NextResponse.json({ error: "Network error" }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json({ error: "TMDB error" }, { status: 502 });
  }

  const data = await res.json();

  const results: ExternalResult[] = (data.results ?? [])
    .filter(
      (r: Record<string, unknown>) =>
        r.media_type === "movie" || r.media_type === "tv"
    )
    .slice(0, 7)
    .map((r: Record<string, unknown>) => ({
      external_id: String(r.id),
      title: (r.title ?? r.name ?? "") as string,
      year:
        ((r.release_date as string)?.slice(0, 4) ??
          (r.first_air_date as string)?.slice(0, 4) ??
          null),
      type: r.media_type === "movie" ? "Pelicula" : "Serie",
      poster_path: (r.poster_path as string | null) ?? null,
      overview: (r.overview as string | null) ?? null,
    }));

  return NextResponse.json(results);
}
