import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { agentApprovalsAudit, agentProfiles, users } from "@/lib/db/schema";
import { requireRole } from "./session";

export interface PendingAgentsQuery {
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listPendingAgents({ search = "", page = 1, pageSize = 10 }: PendingAgentsQuery) {
  await requireRole("admin");

  const filters = [eq(agentProfiles.approvalStatus, "pending_approval")];
  const term = search.trim();
  if (term) {
    const like = `%${term}%`;
    filters.push(
      or(ilike(users.fullName, like), ilike(agentProfiles.businessName, like), ilike(users.phone, like))!,
    );
  }
  const where = and(...filters);

  const [{ total }] = await db
    .select({ total: count() })
    .from(agentProfiles)
    .innerJoin(users, eq(users.id, agentProfiles.userId))
    .where(where);

  const rows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      phone: users.phone,
      businessName: agentProfiles.businessName,
      createdAt: users.createdAt,
    })
    .from(agentProfiles)
    .innerJoin(users, eq(users.id, agentProfiles.userId))
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { rows, total, page, pageSize };
}

export type PendingAgent = Awaited<ReturnType<typeof listPendingAgents>>["rows"][number];

export async function getAuditLog(agentId: string) {
  await requireRole("admin");
  return db
    .select()
    .from(agentApprovalsAudit)
    .where(eq(agentApprovalsAudit.agentId, agentId))
    .orderBy(desc(agentApprovalsAudit.createdAt));
}
