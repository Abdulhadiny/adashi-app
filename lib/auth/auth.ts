// NODE-only Auth.js instance. Imported by server components, server actions, and
// route handlers — never by middleware (that uses auth.config directly).
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { normalizeNgPhone } from "./phone";
import { verifyOtp } from "./otp";

const credentialsSchema = z.object({
  phone: z.string().min(6),
  code: z.string().length(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      // Two-field credentials: phone + the OTP code. No password.
      credentials: { phone: {}, code: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const phone = normalizeNgPhone(parsed.data.phone);
        const ok = await verifyOtp(phone, parsed.data.code);
        if (!ok) return null;

        const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
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
