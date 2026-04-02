"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

// Module-level cache persists across renders within the same session
const cache = new Map<string, string | null>();

export default function OgImage({ url }: { url: string }) {
  const [imageUrl, setImageUrl] = useState<string | null | undefined>(
    cache.has(url) ? (cache.get(url) ?? null) : undefined
  );

  useEffect(() => {
    if (cache.has(url)) {
      setImageUrl(cache.get(url) ?? null);
      return;
    }
    fetch(`/api/og?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then(({ imageUrl }: { imageUrl: string | null }) => {
        cache.set(url, imageUrl ?? null);
        setImageUrl(imageUrl ?? null);
      })
      .catch(() => {
        cache.set(url, null);
        setImageUrl(null);
      });
  }, [url]);

  if (!imageUrl) return null;

  return (
    <div
      className="rounded overflow-hidden shrink-0 relative"
      style={{ width: 80, height: 45 }}
    >
      <Image src={imageUrl} alt="" fill className="object-cover" unoptimized />
    </div>
  );
}
