// PIN hashing + verification (scrypt with a per-user random salt). Node-only —
// same rule as otp.ts: never import from edge/client code.
//
// A 6-digit PIN is a ~10^6 keyspace, so no hash makes it safe against offline
// guessing; the real protection is the server-side attempt lockout enforced in
// auth.ts (MAX_PIN_ATTEMPTS / PIN_LOCK_MINUTES). The scrypt hash just keeps a
// leaked users table from being a plaintext PIN list.
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export const PIN_REGEX = /^\d{6}$/;
export const MAX_PIN_ATTEMPTS = 5;
export const PIN_LOCK_MINUTES = 15;

export function isValidPin(pin: string): boolean {
  return PIN_REGEX.test(pin);
}

// Stored as "salthex:hashhex" so each PIN carries its own salt.
export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 32);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPinHash(pin: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(pin, Buffer.from(saltHex, "hex"), 32);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
