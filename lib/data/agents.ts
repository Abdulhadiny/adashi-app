import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { agentProfiles, cycles, transactions, users } from "@/lib/db/schema";
import type { AgentApprovalStatus } from "@/lib/db/schema";
import { requireRole } from "./session";

// The Agents Directory lists only *approved* agents (active or suspended). Agents
// still awaiting approval live on the Approvals page; rejected agents show nowhere.
export async function listAgents() {
  await requireRole("admin");
  return db
    .select({
      id: users.id,
      fullName: users.fullName,
      phone: users.phone,
      createdAt: users.createdAt,
      businessName: agentProfiles.businessName,
      approvalStatus: agentProfiles.approvalStatus,
    })
    .from(agentProfiles)
    .innerJoin(users, eq(users.id, agentProfiles.userId))
    .where(inArray(agentProfiles.approvalStatus, ["active", "suspended"]))
    .orderBy(desc(users.createdAt));
}

export type AgentListItem = Awaited<ReturnType<typeof listAgents>>[number];

// Per-cycle balances for one agent (replaces the cycle_balances view, scoped to agent).
export async function getAgentCycleBalances(agentId: string) {
  await requireRole("admin");
  return db
    .select({
      cycleId: cycles.id,
      participantName: users.fullName,
      participantPhone: users.phone,
      dailyAmount: cycles.dailyAmount,
      status: cycles.status,
      totalDeposited: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.kind} = 'deposit'), 0)`,
      daysPaid: sql<number>`count(*) filter (where ${transactions.kind} = 'deposit')`,
    })
    .from(cycles)
    .innerJoin(users, eq(users.id, cycles.participantId))
    .leftJoin(transactions, eq(transactions.cycleId, cycles.id))
    .where(eq(cycles.agentId, agentId))
    .groupBy(cycles.id, users.fullName, users.phone, cycles.dailyAmount, cycles.status)
    .orderBy(desc(cycles.createdAt));
}

export async function getAgentRecentTransactions(agentId: string, limit = 10) {
  await requireRole("admin");
  return db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      kind: transactions.kind,
      dayOfCycle: transactions.dayOfCycle,
      createdAt: transactions.createdAt,
      participantName: users.fullName,
    })
    .from(transactions)
    .innerJoin(cycles, eq(cycles.id, transactions.cycleId))
    .innerJoin(users, eq(users.id, cycles.participantId))
    .where(eq(cycles.agentId, agentId))
    .orderBy(desc(transactions.createdAt))
    .limit(limit);
}

export async function getAgentDetail(agentId: string) {
  await requireRole("admin");
  const [balances, recent] = await Promise.all([
    getAgentCycleBalances(agentId),
    getAgentRecentTransactions(agentId),
  ]);
  return { balances, recent };
}

// Internal mutation used by the Agents-page server action.
export async function setAgentApprovalStatus(agentId: string, status: AgentApprovalStatus) {
  await db.update(agentProfiles).set({ approvalStatus: status }).where(eq(agentProfiles.userId, agentId));
}
