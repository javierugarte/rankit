import { NextResponse } from "next/server";
import {
  hashPairingValue,
  isUUID,
  pairingSecret,
  tvPairingAdmin,
  tvPairingConfiguration,
} from "@/lib/tv-pairing";

export const runtime = "nodejs";

const headers = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const configuration = tvPairingConfiguration();
  if (!configuration) return json({ error: "TV pairing is not configured" }, 503);

  const { id } = await params;
  const secret = pairingSecret(request);
  if (!isUUID(id) || !secret) return json({ error: "Invalid pairing request" }, 400);

  const client = tvPairingAdmin(configuration);
  const { data: pairing, error } = await client
    .from("towatchtv_device_pairings")
    .select("id, user_id, status, expires_at")
    .eq("id", id)
    .eq("device_secret_hash", hashPairingValue(secret))
    .maybeSingle();

  if (error || !pairing) return json({ error: "Pairing request not found" }, 404);
  if (new Date(pairing.expires_at) <= new Date()) return json({ error: "Code expired" }, 410);
  if (pairing.status !== "approved" || !pairing.user_id) {
    return json({ error: "Pairing has not been approved" }, 409);
  }

  const { data: userData, error: userError } = await client.auth.admin.getUserById(pairing.user_id);
  const email = userData.user?.email;
  if (userError || !email) return json({ error: "Unable to create the TV session" }, 500);

  const { data: linkData, error: linkError } = await client.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError || !linkData) return json({ error: "Unable to create the TV session" }, 500);

  const { data: consumed, error: consumeError } = await client
    .from("towatchtv_device_pairings")
    .update({ status: "consumed", consumed_at: new Date().toISOString() })
    .eq("id", pairing.id)
    .eq("status", "approved")
    .select("id")
    .maybeSingle();

  if (consumeError || !consumed) return json({ error: "Pairing request already used" }, 409);
  return json({ token_hash: linkData.properties.hashed_token, type: linkData.properties.verification_type });
}
