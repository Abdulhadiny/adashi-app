"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { agentApprovalsAudit, agentProfiles, users } from "@/lib/db/schema";
import { requireRole } from "@/lib/data/session";
import { getAuditLog } from "@/lib/data/approvals";
import { dispatchAgentApprovalNotification } from "@/lib/notifications/dispatch";

async function decide(agentId: string, action: "approved" | "rejected", note?: string) {
  const { userId: adminId } = await requireRole("admin");

  const [agent] = await db
    .select({ fullName: users.fullName, phone: users.phone })
    .from(users)
    .where(eq(users.id, agentId))
    .limit(1);
  if (!agent) throw new Error("Agent not found.");

  await db
    .update(agentProfiles)
    .set({ approvalStatus: action === "approved" ? "active" : "rejected" })
    .where(eq(agentProfiles.userId, agentId));

  await db.insert(agentApprovalsAudit).values({ agentId, adminId, action, note: note ?? null });

  // Non-fatal: dispatch + record the outbound notification.
  await dispatchAgentApprovalNotification({
    agentId,
    agentName: agent.fullName,
    agentPhone: agent.phone,
    action,
    note,
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
