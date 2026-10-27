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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const configuration = tvPairingConfiguration();
  if (!configuration) return json({ error: "TV pairing is not configured" }, 503);

  const { id } = await params;
  const secret = pairingSecret(request);
  if (!isUUID(id) || !secret) return json({ error: "Invalid pairing request" }, 400);

  const { data: pairing, error } = await tvPairingAdmin(configuration)
    .from("towatchtv_device_pairings")
    .select("status, expires_at")
    .eq("id", id)
    .eq("device_secret_hash", hashPairingValue(secret))
    .maybeSingle();

  if (error || !pairing) return json({ error: "Pairing request not found" }, 404);
  const status = new Date(pairing.expires_at) <= new Date() ? "expired" : pairing.status;
  return json({ status, expires_at: pairing.expires_at });
}
