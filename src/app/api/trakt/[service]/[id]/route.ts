import { NextResponse } from "next/server";

type TmdbDetails = {
  name?: string;
  release_date?: string;
  title?: string;
};

function toTraktSlug(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ service: string; id: string }> }
) {
  const { service, id } = await params;
  const mediaType = service === "movies" ? "movie" : service === "tv" ? "tv" : null;

  if (!mediaType || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid TMDB reference" }, { status: 404 });
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TMDB_API_KEY not configured" }, { status: 503 });
  }

  let response: Response;
  try {
    response = await fetch(
      `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${apiKey}&language=en-US`,
      { next: { revalidate: 604800 } }
    );
  } catch {
    return NextResponse.json({ error: "Unable to reach TMDB" }, { status: 502 });
  }

  if (!response.ok) {
    return NextResponse.json({ error: "TMDB title not found" }, { status: 404 });
  }

  const details = (await response.json()) as TmdbDetails;
  const title = mediaType === "movie" ? details.title : details.name;
  const slug = title ? toTraktSlug(title) : "";

  if (!slug) {
    return NextResponse.json({ error: "TMDB title not found" }, { status: 404 });
  }

  const year = details.release_date?.slice(0, 4);
  const traktPath =
    mediaType === "movie" && year
      ? `movies/${slug}-${year}`
      : `${mediaType === "movie" ? "movies" : "shows"}/${slug}`;

  return NextResponse.redirect(`https://app.trakt.tv/${traktPath}`);
}
