import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 500;
const responseHeaders = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: responseHeaders });
}

function validApiKey(candidate: string | null, expected: string): boolean {
  if (!candidate) return false;

  const candidateHash = createHash("sha256").update(candidate).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(candidateHash, expectedHash);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = process.env.RANKIT_READ_API_KEY;
  const mobileApiKey = process.env.RANKIT_TOWATCHTV_API_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if ((!apiKey && !mobileApiKey) || !serviceRoleKey || !supabaseUrl
      || (apiKey && mobileApiKey && validApiKey(mobileApiKey, apiKey))) {
    return json({ error: "Read-only API is not configured" }, 503);
  }

  const suppliedKey = request.headers.get("x-api-key");
  const isGeneralReader = !!apiKey && validApiKey(suppliedKey, apiKey);
  const isMobileReader = !!mobileApiKey && validApiKey(suppliedKey, mobileApiKey);
  if (!isGeneralReader && !isMobileReader) {
    return json({ error: "Invalid API key" }, 401);
  }

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return json({ error: "Invalid list ID" }, 400);
  }

  if (isMobileReader && !isGeneralReader) {
    const allowedIDs = [
      process.env.RANKIT_TOWATCHTV_SERIES_LIST_ID,
      process.env.RANKIT_TOWATCHTV_MOVIES_LIST_ID,
    ].filter((value): value is string => !!value && UUID_PATTERN.test(value));
    if (!allowedIDs.some((value) => value.toLowerCase() === id.toLowerCase())) {
      return json({ error: "List not found" }, 404);
    }
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: list, error: listError } = await supabase
      .from("lists")
      .select("id, name, emoji, list_type, sort_mode, created_at")
      .eq("id", id)
      .maybeSingle();

    if (listError) return json({ error: "Unable to read list" }, 500);
    if (!list) return json({ error: "List not found" }, 404);

    const items = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("items")
        .select("id, title, category, external_id, external_data, completed, completed_at, total_votes, created_at")
        .eq("list_id", id)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error || !data) return json({ error: "Unable to read list items" }, 500);
      items.push(...data);
      if (data.length < PAGE_SIZE) break;
    }

    return json({ list, items });
  } catch {
    return json({ error: "Unable to read list" }, 500);
  }
}
