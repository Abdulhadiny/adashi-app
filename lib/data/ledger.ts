import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db/client";
import { agentProfiles, cycles, transactions, users } from "@/lib/db/schema";
import { requireRole } from "./session";

export interface LedgerQuery {
  agentId?: string;
  from?: string; // ISO date (yyyy-mm-dd)
  to?: string;
  page?: number;
  pageSize?: number;
}

const participant = alias(users, "participant");
const agent = alias(users, "agent");

export async function listTransactions({
  agentId,
  from,
  to,
  page = 1,
  pageSize = 15,
}: LedgerQuery) {
  await requireRole("admin");

  const filters = [];
  if (agentId) filters.push(eq(cycles.agentId, agentId));
  if (from) filters.push(gte(transactions.createdAt, new Date(`${from}T00:00:00`)));
  if (to) filters.push(lte(transactions.createdAt, new Date(`${to}T23:59:59`)));
  const where = filters.length ? and(...filters) : undefined;

  const base = db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      kind: transactions.kind,
      dayOfCycle: transactions.dayOfCycle,
      createdAt: transactions.createdAt,
      participantName: participant.fullName,
      participantPhone: participant.phone,
      agentBusiness: agentProfiles.businessName,
      agentName: agent.fullName,
    })
    .from(transactions)
    .innerJoin(cycles, eq(cycles.id, transactions.cycleId))
    .innerJoin(participant, eq(participant.id, cycles.participantId))
    .innerJoin(agent, eq(agent.id, cycles.agentId))
    .leftJoin(agentProfiles, eq(agentProfiles.userId, cycles.agentId));

  const rows = await (where ? base.where(where) : base)
    .orderBy(desc(transactions.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const countBase = db
    .select({ total: count() })
    .from(transactions)
    .innerJoin(cycles, eq(cycles.id, transactions.cycleId));
  const [{ total }] = await (where ? countBase.where(where) : countBase);

  return { rows, total, page, pageSize };
}

export type LedgerRow = Awaited<ReturnType<typeof listTransactions>>["rows"][number];

// For the agent filter dropdown.
export async function listAgentsForFilter() {
  await requireRole("admin");
  return db
    .select({
      id: users.id,
      fullName: users.fullName,
      businessName: agentProfiles.businessName,
    })
    .from(agentProfiles)
    .innerJoin(users, eq(users.id, agentProfiles.userId))
    .orderBy(agentProfiles.businessName);
}
