import { NextResponse } from "next/server";
import { z } from "zod";
import { issueOtp } from "@/lib/auth/otp";

const schema = z.object({ phone: z.string().min(6) });

// POST { phone } → generate + store + dispatch an OTP. Always returns { ok: true }
// so the response never reveals whether the phone belongs to a real user.
export async function POST(request: Request) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const parsed = schema.safeParse(body);
  if (parsed.success) {
    try {
      await issueOtp(parsed.data.phone);
    } catch (err) {
      console.error("[otp/send] issueOtp failed:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
