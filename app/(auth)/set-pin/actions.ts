"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getSessionOrThrow } from "@/lib/data/session";
import { hashPin, isValidPin } from "@/lib/auth/pin";

// Set (or replace) the caller's login PIN. Reaching this authenticated is the
// authorization: either a fresh OTP-verified login (onboarding / forgot-PIN) or
// an existing session changing its PIN.
export async function setPinAction(pin: string): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await getSessionOrThrow();
  if (!isValidPin(pin)) return { ok: false, error: "Your PIN must be exactly 6 digits." };

  await db
    .update(users)
    .set({ pinHash: hashPin(pin), pinFailedAttempts: 0, pinLockedUntil: null })
    .where(eq(users.id, userId));
  return { ok: true };
}

// Post-OTP-verify routing: does the caller still need to create a PIN?
export async function needsPinAction(): Promise<boolean> {
  const { userId } = await getSessionOrThrow();
  const [row] = await db
    .select({ pinHash: users.pinHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return !row?.pinHash;
}
