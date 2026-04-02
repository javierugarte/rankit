import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ imageUrl: null });

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RankIt/1.0; +https://rankit.app)" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return NextResponse.json({ imageUrl: null });

    const html = await res.text();
    const base = new URL(url).origin;

    const imageUrl = extractMetaImage(html, base);
    return NextResponse.json({ imageUrl });
  } catch {
    return NextResponse.json({ imageUrl: null });
  }
}

function extractMetaImage(html: string, base: string): string | null {
  // Matches <meta property="og:image" content="..."> in any attribute order
  const patterns = [
    /property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const src = match[1].trim();
      if (src.startsWith("http")) return src;
      if (src.startsWith("//")) return `https:${src}`;
      if (src.startsWith("/")) return `${base}${src}`;
    }
  }

  return null;
}
