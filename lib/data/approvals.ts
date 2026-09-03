import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db/client";
import { agentProfiles, auditLog, users } from "@/lib/db/schema";
import { requireRole } from "./session";
import { ngPhoneSearchNeedle } from "@/lib/format";

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
    const conds = [ilike(users.fullName, like), ilike(agentProfiles.businessName, like)];
    // Phones are stored E.164 (234…) but shown as 0803…; match on the E.164
    // needle so a phone typed in either form still hits. Skip for pure text.
    const phone = ngPhoneSearchNeedle(term);
    if (phone) conds.push(ilike(users.phone, `%${phone}%`));
    filters.push(or(...conds)!);
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

// Per-agent history (the Approvals "History" modal): the audit trail scoped to one agent.
export async function getAuditLog(agentId: string) {
  await requireRole("admin");
  const actor = alias(users, "actor");
  return db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      summary: auditLog.summary,
      note: auditLog.note,
      createdAt: auditLog.createdAt,
      actorName: actor.fullName,
    })
    .from(auditLog)
    .leftJoin(actor, eq(actor.id, auditLog.actorId))
    .where(and(eq(auditLog.entityType, "agent"), eq(auditLog.entityId, agentId)))
    .orderBy(desc(auditLog.createdAt));
}

// The global audit trail for the admin Audit Logs page.
export async function listAuditLog(limit = 100) {
  await requireRole("admin");
  const actor = alias(users, "actor");
  const entity = alias(users, "entity");
  return db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      summary: auditLog.summary,
      note: auditLog.note,
      createdAt: auditLog.createdAt,
      actorName: actor.fullName,
      entityName: entity.fullName,
    })
    .from(auditLog)
    .leftJoin(actor, eq(actor.id, auditLog.actorId))
    .leftJoin(entity, eq(entity.id, auditLog.entityId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

export type AuditLogRow = Awaited<ReturnType<typeof listAuditLog>>[number];
