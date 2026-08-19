import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  agentParticipants,
  agentProfiles,
  cycles,
  disputes,
  participantProfiles,
  transactions,
  users,
} from "@/lib/db/schema";
import { normalizeNgPhone } from "@/lib/auth/phone";
import { ForbiddenError, requireRole } from "./session";

export interface AgentContext {
  userId: string;
  fullName: string;
  phone: string;
  businessName: string;
  approvalStatus: "pending_approval" | "active" | "suspended" | "rejected";
}

// The agent's profile — used by the layout to decide the pending/active gate.
export async function getAgentContext(): Promise<AgentContext> {
  const s = await requireRole("agent");
  const [row] = await db
    .select({
      fullName: users.fullName,
      phone: users.phone,
      businessName: agentProfiles.businessName,
      approvalStatus: agentProfiles.approvalStatus,
    })
    .from(users)
    .leftJoin(agentProfiles, eq(agentProfiles.userId, users.id))
    .where(eq(users.id, s.userId))
    .limit(1);
  return {
    userId: s.userId,
    fullName: row?.fullName ?? "",
    phone: row?.phone ?? "",
    businessName: row?.businessName ?? "",
    approvalStatus: row?.approvalStatus ?? "pending_approval",
  };
}

// Feature gate: only an approved (active) agent may read/write agent data.
export async function requireActiveAgent(): Promise<AgentContext> {
  const ctx = await getAgentContext();
  if (ctx.approvalStatus !== "active") {
    throw new ForbiddenError("Your agent account is not active.");
  }
  return ctx;
}

export async function getAgentSummary() {
  const { userId } = await requireActiveAgent();

  const [cash] = await db
    .select({
      v: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.kind} = 'deposit'), 0)`,
    })
    .from(transactions)
    .innerJoin(cycles, eq(cycles.id, transactions.cycleId))
    .where(eq(cycles.agentId, userId));

  const [{ activePlans }] = await db
    .select({ activePlans: count() })
    .from(cycles)
    .where(and(eq(cycles.agentId, userId), eq(cycles.status, "active")));

  const [{ savers }] = await db
    .select({ savers: count() })
    .from(agentParticipants)
    .where(and(eq(agentParticipants.agentId, userId), eq(agentParticipants.status, "active")));

  const [{ openDisputes }] = await db
    .select({ openDisputes: count() })
    .from(disputes)
    .where(and(eq(disputes.agentId, userId), eq(disputes.status, "open")));

  const todaysDeposits = await db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      dayOfCycle: transactions.dayOfCycle,
      createdAt: transactions.createdAt,
      participantName: users.fullName,
    })
    .from(transactions)
    .innerJoin(cycles, eq(cycles.id, transactions.cycleId))
    .innerJoin(users, eq(users.id, cycles.participantId))
    .where(
      and(
        eq(cycles.agentId, userId),
        eq(transactions.kind, "deposit"),
        sql`${transactions.createdAt} >= date_trunc('day', now())`,
      ),
    )
    .orderBy(desc(transactions.createdAt));

  return { fieldCash: cash.v, activePlans, savers, openDisputes, todaysDeposits };
}

export async function listMyParticipants() {
  const { userId } = await requireActiveAgent();

  const parts = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      phone: users.phone,
      status: users.status,
      nickname: participantProfiles.nickname,
    })
    .from(agentParticipants)
    .innerJoin(users, eq(users.id, agentParticipants.participantId))
    .leftJoin(participantProfiles, eq(participantProfiles.userId, users.id))
    .where(and(eq(agentParticipants.agentId, userId), eq(agentParticipants.status, "active")))
    .orderBy(users.fullName);

  const activeCycles = await db
    .select({
      cycleId: cycles.id,
      participantId: cycles.participantId,
      dailyAmount: cycles.dailyAmount,
      totalDeposited: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.kind} = 'deposit'), 0)`,
      daysPaid: sql<number>`count(*) filter (where ${transactions.kind} = 'deposit')`,
    })
    .from(cycles)
    .leftJoin(transactions, eq(transactions.cycleId, cycles.id))
    .where(and(eq(cycles.agentId, userId), eq(cycles.status, "active")))
    .groupBy(cycles.id, cycles.participantId, cycles.dailyAmount);

  const byParticipant = new Map(activeCycles.map((c) => [c.participantId, c]));
  return parts.map((p) => ({ ...p, activeCycle: byParticipant.get(p.id) ?? null }));
}

export type MyParticipant = Awaited<ReturnType<typeof listMyParticipants>>[number];

// Cross-agent lookup by phone (replaces lookup_participant_by_phone RPC).
export async function lookupParticipantByPhone(rawPhone: string) {
  const { userId } = await requireActiveAgent();
  const phone = normalizeNgPhone(rawPhone);
  if (!phone) return null;

  const [p] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      phone: users.phone,
      nickname: participantProfiles.nickname,
    })
    .from(users)
    .leftJoin(participantProfiles, eq(participantProfiles.userId, users.id))
    .where(and(eq(users.phone, phone), eq(users.role, "participant")))
    .limit(1);
  if (!p) return null;

  const [link] = await db
    .select({ agentId: agentParticipants.agentId })
    .from(agentParticipants)
    .where(
      and(
        eq(agentParticipants.agentId, userId),
        eq(agentParticipants.participantId, p.id),
        eq(agentParticipants.status, "active"),
      ),
    )
    .limit(1);

  return { ...p, isAlreadyLinked: !!link };
}

export async function getMyCycles(status?: "active" | "closed") {
  const { userId } = await requireActiveAgent();
  const filters = [eq(cycles.agentId, userId)];
  if (status) filters.push(eq(cycles.status, status));
  return db
    .select({
      id: cycles.id,
      participantName: users.fullName,
      participantPhone: users.phone,
      dailyAmount: cycles.dailyAmount,
      status: cycles.status,
      startDate: cycles.startDate,
      endDate: cycles.endDate,
      commission: cycles.commission,
      payoutAmount: cycles.payoutAmount,
    })
    .from(cycles)
    .innerJoin(users, eq(users.id, cycles.participantId))
    .where(and(...filters))
    .orderBy(desc(cycles.createdAt));
}

export async function getCycleDetail(cycleId: string) {
  const { userId } = await requireActiveAgent();

  const [cycle] = await db
    .select({
      id: cycles.id,
      participantId: cycles.participantId,
      participantName: users.fullName,
      participantPhone: users.phone,
      dailyAmount: cycles.dailyAmount,
      status: cycles.status,
      startDate: cycles.startDate,
      endDate: cycles.endDate,
      commission: cycles.commission,
      payoutAmount: cycles.payoutAmount,
    })
    .from(cycles)
    .innerJoin(users, eq(users.id, cycles.participantId))
    .where(and(eq(cycles.id, cycleId), eq(cycles.agentId, userId)))
    .limit(1);
  if (!cycle) return null;

  const deposits = await db
    .select({
      id: transactions.id,
      dayOfCycle: transactions.dayOfCycle,
      amount: transactions.amount,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .where(and(eq(transactions.cycleId, cycleId), eq(transactions.kind, "deposit")))
    .orderBy(asc(transactions.dayOfCycle));

  const totalDeposited = deposits.reduce((s, d) => s + Number(d.amount), 0);
  return { cycle, deposits, totalDeposited: totalDeposited.toFixed(2), daysPaid: deposits.length };
}

export async function listMyDisputes() {
  const { userId } = await requireActiveAgent();
  return db
    .select({
      id: disputes.id,
      reason: disputes.reason,
      status: disputes.status,
      resolutionNote: disputes.resolutionNote,
      resolvedAt: disputes.resolvedAt,
      createdAt: disputes.createdAt,
      participantName: users.fullName,
      participantPhone: users.phone,
      txAmount: transactions.amount,
      txKind: transactions.kind,
      txDay: transactions.dayOfCycle,
    })
    .from(disputes)
    .innerJoin(users, eq(users.id, disputes.participantId))
    .innerJoin(transactions, eq(transactions.id, disputes.transactionId))
    .where(eq(disputes.agentId, userId))
    .orderBy(desc(disputes.createdAt));
}

export type AgentDisputeRow = Awaited<ReturnType<typeof listMyDisputes>>[number];
