"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { agentProfiles, users } from "@/lib/db/schema";
import { requireRole } from "@/lib/data/session";
import { getAuditLog } from "@/lib/data/approvals";
import { createNotification, recordAudit } from "@/lib/notifications/inapp";

async function decide(agentId: string, action: "approved" | "rejected", note?: string) {
  const { userId: adminId } = await requireRole("admin");

  const [agent] = await db
    .select({ fullName: users.fullName })
    .from(users)
    .where(eq(users.id, agentId))
    .limit(1);
  if (!agent) throw new Error("Agent not found.");

  await db
    .update(agentProfiles)
    .set({ approvalStatus: action === "approved" ? "active" : "rejected" })
    .where(eq(agentProfiles.userId, agentId));

  // Audit trail (single source for the admin Audit Logs page + per-agent History).
  await recordAudit({
    actorId: adminId,
    action: action === "approved" ? "agent_approved" : "agent_rejected",
    entityType: "agent",
    entityId: agentId,
    summary: `${action === "approved" ? "Approved" : "Rejected"} agent ${agent.fullName}`,
    note: note ?? null,
  });

  // In-app: tell the agent the outcome (welcome on approval).
  await createNotification({
    recipientId: agentId,
    type: action === "approved" ? "agent_approved" : "agent_rejected",
    title: action === "approved" ? "Welcome to Adashi" : "Application update",
    body:
      action === "approved"
        ? "Your agent account has been approved. You can now sign in and start onboarding savers."
        : `Your agent application was not approved${note ? `: ${note}` : "."}`,
  });

  revalidatePath("/admin/approvals");
  revalidatePath("/admin/agents");
}

export async function approveAgentAction(agentId: string, note?: string) {
  await decide(agentId, "approved", note?.trim() || undefined);
}

export async function rejectAgentAction(agentId: string, note: string) {
  const trimmed = note.trim();
  if (!trimmed) throw new Error("A rejection reason is required.");
  await decide(agentId, "rejected", trimmed);
}

export async function getAuditLogAction(agentId: string) {
  await requireRole("admin");
  return getAuditLog(agentId);
}
