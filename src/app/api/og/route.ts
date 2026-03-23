import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ imageUrl: null });

  try {
    new URL(url); // validate URL
  } catch {
    return NextResponse.json({ imageUrl: null });
  }

  // Try Microlink first — handles anti-bot, JS-rendered pages, major retailers
  const imageUrl = await fetchViaMicrolink(url) ?? await fetchViaDirectHtml(url);
  return NextResponse.json({ imageUrl });
}

async function fetchViaMicrolink(url: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.microlink.io?url=${encodeURIComponent(url)}&palette=false&audio=false&video=false&iframe=false`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.data?.image?.url as string) ?? null;
  } catch {
    return null;
  }
}

async function fetchViaDirectHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const html = await res.text();
    const base = new URL(url).origin;

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
  } catch {
    return null;
  }
}
