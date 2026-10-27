import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export type TVPairingConfiguration = {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
};

export function tvPairingConfiguration(): TVPairingConfiguration | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) return null;
  return { supabaseUrl, anonKey, serviceRoleKey };
}

export function tvPairingAdmin(configuration: TVPairingConfiguration) {
  return createClient<Database>(configuration.supabaseUrl, configuration.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function hashPairingValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function generatePairingCode(): string {
  return Array.from({ length: CODE_LENGTH }, () =>
    CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  ).join("");
}

export function generatePairingSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function generatePairingID(): string {
  return randomUUID();
}

export function normalizePairingCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase().replace(/[\s-]/g, "");
  return new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`).test(code) ? code : null;
}

export function pairingSecret(request: Request): string | null {
  const value = request.headers.get("x-towatchtv-pairing-secret")?.trim();
  return value && value.length >= 32 ? value : null;
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ", 2);
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

export function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
