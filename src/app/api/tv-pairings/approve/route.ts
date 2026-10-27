import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  bearerToken,
  hashPairingValue,
  normalizePairingCode,
  tvPairingAdmin,
  tvPairingConfiguration,
} from "@/lib/tv-pairing";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";

const headers = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers });
}

export async function POST(request: Request) {
  const configuration = tvPairingConfiguration();
  if (!configuration) return json({ error: "TV pairing is not configured" }, 503);

  const token = bearerToken(request);
  if (!token) return json({ error: "Authentication required" }, 401);

  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const code = normalizePairingCode(body.code);
  if (!code) return json({ error: "Invalid code" }, 400);

  const userClient = createClient<Database>(configuration.supabaseUrl, configuration.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  const user = userData.user;
  if (userError || !user) return json({ error: "Authentication required" }, 401);

  const client = tvPairingAdmin(configuration);
  const { data: pairing, error: lookupError } = await client
    .from("towatchtv_device_pairings")
    .select("id, user_id, status, expires_at")
    .eq("code_hash", hashPairingValue(code))
    .maybeSingle();

  if (lookupError || !pairing) return json({ error: "Code not found" }, 404);
  if (new Date(pairing.expires_at) <= new Date()) return json({ error: "Code expired" }, 410);
  if (pairing.status === "consumed") return json({ error: "Code already used" }, 409);
  if (pairing.status === "approved") {
    return pairing.user_id === user.id
      ? json({ status: "approved" })
      : json({ error: "Code belongs to another account" }, 409);
  }

  const { data: approved, error: updateError } = await client
    .from("towatchtv_device_pairings")
    .update({ user_id: user.id, status: "approved", approved_at: new Date().toISOString() })
    .eq("id", pairing.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError || !approved) return json({ error: "Code is no longer available" }, 409);
  return json({ status: "approved" });
}
