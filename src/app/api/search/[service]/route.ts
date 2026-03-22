import { NextRequest, NextResponse } from "next/server";
import type { ExternalResult } from "@/lib/services";

// TMDB genre ID → name (ES). IDs are stable across API versions.
const MOVIE_GENRES: Record<number, string> = {
  28: "Accion", 12: "Aventura", 16: "Animacion", 35: "Comedia",
  80: "Crimen", 99: "Documental", 18: "Drama", 10751: "Familiar",
  14: "Fantasia", 36: "Historia", 27: "Terror", 10402: "Musica",
  9648: "Misterio", 10749: "Romance", 878: "Ciencia ficcion",
  53: "Suspense", 10752: "Belica", 37: "Western",
};

const TV_GENRES: Record<number, string> = {
  10759: "Accion", 16: "Animacion", 35: "Comedia", 80: "Crimen",
  99: "Documental", 18: "Drama", 10751: "Familiar", 10762: "Infantil",
  9648: "Misterio", 10763: "Noticias", 10764: "Reality",
  10765: "Ciencia ficcion", 37: "Western",
};

function resolveGenre(genreIds: number[], map: Record<number, string>): string | null {
  for (const id of genreIds) {
    if (map[id]) return map[id];
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ service: string }> }
) {
  const { service } = await params;
  const q = req.nextUrl.searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return NextResponse.json([]);
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TMDB_API_KEY not configured" }, { status: 500 });
  }

  if (service === "movies") return searchMovies(q.trim(), apiKey);
  if (service === "tv") return searchTV(q.trim(), apiKey);

  return NextResponse.json({ error: "Unknown service" }, { status: 400 });
}

async function searchMovies(query: string, apiKey: string): Promise<NextResponse> {
  const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&api_key=${apiKey}&language=es-ES&page=1`;

  let res: Response;
  try {
    res = await fetch(url, { next: { revalidate: 60 } });
  } catch {
    return NextResponse.json({ error: "Network error" }, { status: 502 });
  }

  if (!res.ok) return NextResponse.json({ error: "TMDB error" }, { status: 502 });

  const data = await res.json();

  const results: ExternalResult[] = (data.results ?? [])
    .slice(0, 7)
    .map((r: Record<string, unknown>) => ({
      external_id: String(r.id),
      title: (r.title ?? "") as string,
      year: ((r.release_date as string)?.slice(0, 4) ?? null),
      genre: resolveGenre((r.genre_ids as number[]) ?? [], MOVIE_GENRES),
      poster_path: (r.poster_path as string | null) ?? null,
      overview: (r.overview as string | null) ?? null,
    }));

  return NextResponse.json(results);
}

async function searchTV(query: string, apiKey: string): Promise<NextResponse> {
  const url = `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(query)}&api_key=${apiKey}&language=es-ES&page=1`;

  let res: Response;
  try {
    res = await fetch(url, { next: { revalidate: 60 } });
  } catch {
    return NextResponse.json({ error: "Network error" }, { status: 502 });
  }

  if (!res.ok) return NextResponse.json({ error: "TMDB error" }, { status: 502 });

  const data = await res.json();

  const results: ExternalResult[] = (data.results ?? [])
    .slice(0, 7)
    .map((r: Record<string, unknown>) => ({
      external_id: String(r.id),
      title: (r.name ?? "") as string,
      year: ((r.first_air_date as string)?.slice(0, 4) ?? null),
      genre: resolveGenre((r.genre_ids as number[]) ?? [], TV_GENRES),
      poster_path: (r.poster_path as string | null) ?? null,
      overview: (r.overview as string | null) ?? null,
    }));

  return NextResponse.json(results);
}
