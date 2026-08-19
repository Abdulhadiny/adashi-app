import { and, asc, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db/client";
import {
  agentProfiles,
  cycles,
  disputes,
  participantProfiles,
  transactions,
  users,
} from "@/lib/db/schema";
import { requireRole } from "./session";

export interface ParticipantContext {
  userId: string;
  fullName: string;
  phone: string;
  nickname: string | null;
}

export async function getParticipantContext(): Promise<ParticipantContext> {
  const s = await requireRole("participant");
  const [row] = await db
    .select({
      fullName: users.fullName,
      phone: users.phone,
      nickname: participantProfiles.nickname,
    })
    .from(users)
    .leftJoin(participantProfiles, eq(participantProfiles.userId, users.id))
    .where(eq(users.id, s.userId))
    .limit(1);
  return {
    userId: s.userId,
    fullName: row?.fullName ?? "",
    phone: row?.phone ?? "",
    nickname: row?.nickname ?? null,
  };
}

export async function getParticipantSummary() {
  const { userId } = await requireRole("participant");

  const [saved] = await db
    .select({
      v: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.kind} = 'deposit'), 0)`,
    })
    .from(transactions)
    .innerJoin(cycles, eq(cycles.id, transactions.cycleId))
    .where(eq(cycles.participantId, userId));

  const [{ activePlans }] = await db
    .select({ activePlans: sql<number>`count(*)` })
    .from(cycles)
    .where(and(eq(cycles.participantId, userId), eq(cycles.status, "active")));

  return { totalSaved: saved.v, activePlans };
}

// The saver's plans (cycles) with the agent and running balance.
export async function listMyPlans() {
  const { userId } = await requireRole("participant");
  return db
    .select({
      id: cycles.id,
      dailyAmount: cycles.dailyAmount,
      status: cycles.status,
      startDate: cycles.startDate,
      endDate: cycles.endDate,
      commission: cycles.commission,
      payoutAmount: cycles.payoutAmount,
      agentName: users.fullName,
      agentBusiness: agentProfiles.businessName,
      totalDeposited: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.kind} = 'deposit'), 0)`,
      daysPaid: sql<number>`count(*) filter (where ${transactions.kind} = 'deposit')`,
    })
    .from(cycles)
    .innerJoin(users, eq(users.id, cycles.agentId))
    .leftJoin(agentProfiles, eq(agentProfiles.userId, cycles.agentId))
    .leftJoin(transactions, eq(transactions.cycleId, cycles.id))
    .where(eq(cycles.participantId, userId))
    .groupBy(cycles.id, users.fullName, agentProfiles.businessName)
    .orderBy(desc(cycles.createdAt));
}

export type MyPlan = Awaited<ReturnType<typeof listMyPlans>>[number];

export async function getMyPlanDetail(cycleId: string) {
  const { userId } = await requireRole("participant");

  const [cycle] = await db
    .select({
      id: cycles.id,
      dailyAmount: cycles.dailyAmount,
      status: cycles.status,
      startDate: cycles.startDate,
      endDate: cycles.endDate,
      commission: cycles.commission,
      payoutAmount: cycles.payoutAmount,
      agentName: users.fullName,
      agentBusiness: agentProfiles.businessName,
    })
    .from(cycles)
    .innerJoin(users, eq(users.id, cycles.agentId))
    .leftJoin(agentProfiles, eq(agentProfiles.userId, cycles.agentId))
    .where(and(eq(cycles.id, cycleId), eq(cycles.participantId, userId)))
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

const agentUser = alias(users, "agent_user");

export async function listMyDisputes() {
  const { userId } = await requireRole("participant");
  return db
    .select({
      id: disputes.id,
      reason: disputes.reason,
      status: disputes.status,
      resolutionNote: disputes.resolutionNote,
      resolvedAt: disputes.resolvedAt,
      createdAt: disputes.createdAt,
      agentName: agentUser.fullName,
      txAmount: transactions.amount,
      txKind: transactions.kind,
      txDay: transactions.dayOfCycle,
    })
    .from(disputes)
    .innerJoin(transactions, eq(transactions.id, disputes.transactionId))
    .innerJoin(agentUser, eq(agentUser.id, disputes.agentId))
    .where(eq(disputes.participantId, userId))
    .orderBy(desc(disputes.createdAt));
}

export type ParticipantDisputeRow = Awaited<ReturnType<typeof listMyDisputes>>[number];
