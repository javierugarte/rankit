import { NextResponse } from "next/server";
import {
  generatePairingCode,
  generatePairingID,
  generatePairingSecret,
  hashPairingValue,
  tvPairingAdmin,
  tvPairingConfiguration,
} from "@/lib/tv-pairing";

export const runtime = "nodejs";

const headers = { "Cache-Control": "no-store" };
const expiryMilliseconds = 5 * 60 * 1000;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers });
}

export async function POST() {
  const configuration = tvPairingConfiguration();
  if (!configuration) return json({ error: "TV pairing is not configured" }, 503);

  const client = tvPairingAdmin(configuration);
  const expiresAt = new Date(Date.now() + expiryMilliseconds).toISOString();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const id = generatePairingID();
    const code = generatePairingCode();
    const secret = generatePairingSecret();
    const { error } = await client.from("towatchtv_device_pairings").insert({
      id,
      code_hash: hashPairingValue(code),
      device_secret_hash: hashPairingValue(secret),
      expires_at: expiresAt,
    });

    if (!error) {
      return json({ id, code, secret, expires_at: expiresAt }, 201);
    }
  }

  return json({ error: "Unable to create a pairing request" }, 503);
}
