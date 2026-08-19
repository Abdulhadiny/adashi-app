"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { agentProfiles, users } from "@/lib/db/schema";
import { isValidNgPhone, normalizeNgPhone } from "@/lib/auth/phone";
import { issueOtp } from "@/lib/auth/otp";

// Agent self-registration (replaces the handle_new_agent trigger). Public: creates
// an agent user + a pending_approval profile, then sends a login OTP.
export async function signupAgentAction(input: {
  phone: string;
  fullName: string;
  businessName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const phone = normalizeNgPhone(input.phone);
  if (!isValidNgPhone(phone)) return { ok: false, error: "Enter a valid Nigerian phone number." };

  const fullName = input.fullName.trim();
  const businessName = input.businessName.trim();
  if (!fullName || !businessName) {
    return { ok: false, error: "Full name and business name are required." };
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1);
  if (existing) {
    return { ok: false, error: "That phone number is already registered — please sign in instead." };
  }

  const [user] = await db
    .insert(users)
    .values({ phone, fullName, role: "agent", status: "active" })
    .returning({ id: users.id });
  await db
    .insert(agentProfiles)
    .values({ userId: user.id, businessName, approvalStatus: "pending_approval" });

  await issueOtp(phone);
  return { ok: true };
}
