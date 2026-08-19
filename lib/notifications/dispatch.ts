// Outbound message dispatch, ported from the Supabase edge function
// send_agent_approval_notification. Provider sits behind an interface; the dev
// stub logs to the server console. Writes ONE agent-only notifications row.
import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";

export interface MessageProvider {
  sendWhatsApp(phone: string, body: string): Promise<{ ok: boolean; error?: string }>;
}

class ConsoleMessageProvider implements MessageProvider {
  async sendWhatsApp(phone: string, body: string) {
    console.log(`\n  [NOTIFY → ${phone}] ${body}\n`);
    return { ok: true };
  }
}

// Real Twilio / WAAPI / Meta providers slot in here later (selected by env),
// ported from the legacy edge function.
export function getMessageProvider(): MessageProvider {
  return new ConsoleMessageProvider();
}

const APPROVAL_MESSAGE = {
  approved: (name: string) =>
    `Hello ${name}, your Adashi agent account has been approved. You can now sign in and start onboarding savers.`,
  rejected: (name: string, note?: string) =>
    `Hello ${name}, your Adashi agent application was not approved${note ? `: ${note}` : "."}`,
};

export async function dispatchAgentApprovalNotification(params: {
  agentId: string;
  agentName: string;
  agentPhone: string;
  action: "approved" | "rejected";
  note?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { agentId, agentName, agentPhone, action, note } = params;
  const body =
    action === "approved"
      ? APPROVAL_MESSAGE.approved(agentName)
      : APPROVAL_MESSAGE.rejected(agentName, note);

  let ok = false;
  let error: string | undefined;
  try {
    const res = await getMessageProvider().sendWhatsApp(agentPhone, body);
    ok = res.ok;
    error = res.error;
  } catch (e) {
    ok = false;
    error = e instanceof Error ? e.message : "send failed";
  }

  // Agent-only notification row: participantId & channel stay null (notif_shape check).
  await db.insert(notifications).values({
    agentId,
    templateName: action === "approved" ? "agent_approved_v1" : "agent_rejected_v1",
    templateParams: note ? { name: agentName, note } : { name: agentName },
    status: ok ? "sent" : "failed",
    errorCode: ok ? null : (error ?? "unknown"),
    sentAt: ok ? new Date() : null,
  });

  return { ok, error };
}

// ── Participant notifications (ported from send_participant_notification) ──────
type ParticipantNotifType = "onboarding" | "cycle_start" | "deposit" | "cycle_close";

function participantMessage(params: {
  type: ParticipantNotifType;
  participantName: string;
  agentName: string;
  amount?: string;
  dayOfCycle?: number;
}): string {
  const { type, participantName, agentName, amount, dayOfCycle } = params;
  const ngn = amount ? `₦${Number(amount).toLocaleString("en-NG")}` : "";
  switch (type) {
    case "onboarding":
      return `Hello ${participantName}, you have been registered on Adashi by ${agentName}. Your savings journey starts now.`;
    case "cycle_start":
      return `Hello ${participantName}, a new savings cycle of ${ngn}/day has been started for you by ${agentName}.`;
    case "deposit":
      return `Hello ${participantName}, your deposit of ${ngn}${dayOfCycle ? ` (day ${dayOfCycle})` : ""} was recorded by ${agentName}.`;
    case "cycle_close":
      return `Hello ${participantName}, your savings cycle has been closed by ${agentName}. Your payout of ${ngn} is ready.`;
  }
}

// Writes a participant notification row (channel 'whatsapp' — full shape) and sends it.
export async function dispatchParticipantNotification(params: {
  type: ParticipantNotifType;
  participantId: string;
  participantName: string;
  participantPhone: string;
  agentId: string;
  agentName: string;
  amount?: string;
  dayOfCycle?: number;
  transactionId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { type, participantId, participantPhone, agentId, transactionId } = params;
  const body = participantMessage(params);

  let ok = false;
  let error: string | undefined;
  try {
    const res = await getMessageProvider().sendWhatsApp(participantPhone, body);
    ok = res.ok;
    error = res.error;
  } catch (e) {
    ok = false;
    error = e instanceof Error ? e.message : "send failed";
  }

  await db.insert(notifications).values({
    transactionId: transactionId ?? null,
    participantId,
    agentId,
    channel: "whatsapp",
    templateName: `adashi_${type}_v1`,
    templateParams: { message: body },
    status: ok ? "sent" : "failed",
    errorCode: ok ? null : (error ?? "unknown"),
    sentAt: ok ? new Date() : null,
  });

  return { ok, error };
}
