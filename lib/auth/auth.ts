// NODE-only Auth.js instance. Imported by server components, server actions, and
// route handlers — never by middleware (that uses auth.config directly).
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { normalizeNgPhone } from "./phone";
import { verifyOtp } from "./otp";
import { MAX_PIN_ATTEMPTS, PIN_LOCK_MINUTES, verifyPinHash } from "./pin";

// Surfaces as res.code = "pin_locked" on the client (signIn with redirect:false),
// so the login page can tell "locked out" apart from "wrong PIN".
class PinLockedError extends CredentialsSignin {
  code = "pin_locked";
}

// Two sign-in methods through one provider: phone + OTP code (first login /
// onboarding confirmation / PIN reset) or phone + PIN (every login after that).
const credentialsSchema = z.union([
  z.object({ phone: z.string().min(6), pin: z.string().length(6) }),
  z.object({ phone: z.string().min(6), code: z.string().length(6) }),
]);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { phone: {}, code: {}, pin: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const phone = normalizeNgPhone(parsed.data.phone);
        const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

        // ── PIN sign-in ───────────────────────────────────────────────────────
        // Only for active users who completed OTP onboarding and set a PIN
        // (pending participants must activate via OTP first).
        if ("pin" in parsed.data) {
          if (!user || user.status !== "active" || !user.pinHash) return null;
          if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
            throw new PinLockedError();
          }

          if (!verifyPinHash(parsed.data.pin, user.pinHash)) {
            // Atomic increment so concurrent bad guesses can't undercount.
            const [updated] = await db
              .update(users)
              .set({ pinFailedAttempts: sql`${users.pinFailedAttempts} + 1` })
              .where(eq(users.id, user.id))
              .returning({ failed: users.pinFailedAttempts });
            if (updated && updated.failed >= MAX_PIN_ATTEMPTS) {
              await db
                .update(users)
                .set({
                  pinFailedAttempts: 0,
                  pinLockedUntil: new Date(Date.now() + PIN_LOCK_MINUTES * 60_000),
                })
                .where(eq(users.id, user.id));
              throw new PinLockedError();
            }
            return null;
          }

          if (user.pinFailedAttempts > 0 || user.pinLockedUntil) {
            await db
              .update(users)
              .set({ pinFailedAttempts: 0, pinLockedUntil: null })
              .where(eq(users.id, user.id));
          }
          return { id: user.id, role: user.role, phone: user.phone };
        }

        // ── OTP sign-in ───────────────────────────────────────────────────────
        const ok = await verifyOtp(phone, parsed.data.code);
        if (!ok) return null;
        if (!user) return null;
        if (user.status === "suspended") return null;

        // First successful OTP activates a provisioned participant.
        if (user.role === "participant" && user.status === "pending") {
          await db.update(users).set({ status: "active" }).where(eq(users.id, user.id));
        }

        // Minimal shape — only what the JWT needs (no PII beyond phone).
        return { id: user.id, role: user.role, phone: user.phone };
      },
    }),
  ],
});
