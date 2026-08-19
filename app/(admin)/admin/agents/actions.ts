"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/data/session";
import { getAgentDetail, setAgentApprovalStatus } from "@/lib/data/agents";
import type { AgentApprovalStatus } from "@/lib/db/schema";

export async function setAgentStatusAction(agentId: string, status: AgentApprovalStatus) {
  await requireRole("admin");
  await setAgentApprovalStatus(agentId, status);
  revalidatePath("/admin/agents");
}

// Read-on-demand for the detail drawer.
export async function getAgentDetailAction(agentId: string) {
  await requireRole("admin");
  return getAgentDetail(agentId);
}
