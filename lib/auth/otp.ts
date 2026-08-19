// OTP generation, hashing, storage, dispatch, and single-use verification.
// Node-only (uses `crypto` + the DB). Never import from edge/client code.
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { otpCodes } from "@/lib/db/schema";
import { normalizeNgPhone } from "./phone";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

function authSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

// Deterministic keyed hash (HMAC-SHA256) — no native bcrypt, no per-row salt to
// look up, timing-safe compare. We only need to detect equality of a short code.
export function hashOtp(code: string): string {
  return createHmac("sha256", authSecret()).update(code).digest("hex");
}

export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

// ── SMS provider seam ─────────────────────────────────────────────────────────
export interface SmsProvider {
  send(phone: string, code: string): Promise<void>;
}

class ConsoleSmsProvider implements SmsProvider {
  async send(phone: string, code: string): Promise<void> {
    // Dev stub: the code lands in the server console so login works with no SMS cost.
    console.log(`\n  ┌──────────────── ADASHI OTP (dev) ────────────────`);
    console.log(`  │  phone: ${phone}`);
    console.log(`  │  code:  ${code}   (expires in 5 min)`);
    console.log(`  └───────────────────────────────────────────────────\n`);
  }
}

// Real Termii/Twilio providers slot in here later, selected by SMS_PROVIDER.
export function getSmsProvider(): SmsProvider {
  // switch (process.env.SMS_PROVIDER) { case "termii": ...; case "twilio": ...; }
  return new ConsoleSmsProvider();
}

// Create + store + dispatch a fresh OTP. Returns silently on bad input so callers
// can respond uniformly (anti-enumeration).
export async function issueOtp(rawPhone: string): Promise<void> {
  const phone = normalizeNgPhone(rawPhone);
  if (!phone) return;
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await db.insert(otpCodes).values({ phone, codeHash: hashOtp(code), expiresAt });
  await getSmsProvider().send(phone, code);
}

// Verify the newest unconsumed, unexpired code for a phone, then consume it once
// (atomic guarded update so a double-submit can't both succeed).
export async function verifyOtp(rawPhone: string, code: string): Promise<boolean> {
  const phone = normalizeNgPhone(rawPhone);
  if (!phone || !/^\d{6}$/.test(code)) return false;

  const [row] = await db
    .select({ id: otpCodes.id, codeHash: otpCodes.codeHash })
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.phone, phone),
        isNull(otpCodes.consumedAt),
        gt(otpCodes.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!row) return false;

  const expected = Buffer.from(row.codeHash, "hex");
  const actual = Buffer.from(hashOtp(code), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;

  const consumed = await db
    .update(otpCodes)
    .set({ consumedAt: new Date() })
    .where(and(eq(otpCodes.id, row.id), isNull(otpCodes.consumedAt)))
    .returning({ id: otpCodes.id });

  return consumed.length === 1;
}
