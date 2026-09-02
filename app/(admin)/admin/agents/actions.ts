"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { requireRole } from "@/lib/data/session";
import { getAgentDetail, setAgentApprovalStatus } from "@/lib/data/agents";
import { recordAudit } from "@/lib/notifications/inapp";
import type { AgentApprovalStatus } from "@/lib/db/schema";

export async function setAgentStatusAction(agentId: string, status: AgentApprovalStatus) {
  const { userId: adminId } = await requireRole("admin");
  await setAgentApprovalStatus(agentId, status);

  const [agent] = await db
    .select({ fullName: users.fullName })
    .from(users)
    .where(eq(users.id, agentId))
    .limit(1);
  const suspended = status === "suspended";
  await recordAudit({
    actorId: adminId,
    action: suspended ? "agent_suspended" : "agent_activated",
    entityType: "agent",
    entityId: agentId,
    summary: `${suspended ? "Suspended" : "Activated"} agent ${agent?.fullName ?? ""}`.trim(),
  });

  revalidatePath("/admin/agents");
}

// Read-on-demand for the detail drawer.
export async function getAgentDetailAction(agentId: string) {
  await requireRole("admin");
  return getAgentDetail(agentId);
}
