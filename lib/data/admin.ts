import { and, count, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { agentProfiles, cycles, disputes, transactions, users } from "@/lib/db/schema";
import { requireRole } from "./session";

export interface AdminKpis {
  grossVolume: string;
  activeAgents: number;
  totalParticipants: number;
  openDisputes: number;
  commissionPool: string;
}

// Replaces the old Home.tsx client-side .reduce() + head:'exact' count queries.
// Everything is summed/counted in SQL, server-side.
export async function getAdminDashboardKpis(): Promise<AdminKpis> {
  await requireRole("admin");

  const [gross] = await db
    .select({
      v: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.kind} = 'deposit'), 0)`,
    })
    .from(transactions);

  const [{ activeAgents }] = await db
    .select({ activeAgents: count() })
    .from(agentProfiles)
    .where(eq(agentProfiles.approvalStatus, "active"));

  const [{ totalParticipants }] = await db
    .select({ totalParticipants: count() })
    .from(users)
    .where(eq(users.role, "participant"));

  const [{ openDisputes }] = await db
    .select({ openDisputes: count() })
    .from(disputes)
    .where(eq(disputes.status, "open"));

  const [comm] = await db
    .select({ v: sql<string>`coalesce(sum(${cycles.commission}), 0)` })
    .from(cycles);

  return {
    grossVolume: gross.v,
    activeAgents,
    totalParticipants,
    openDisputes,
    commissionPool: comm.v,
  };
}

export interface TrendPoint {
  day: string; // YYYY-MM-DD
  total: string;
}

// Daily deposit totals over the last N days (replaces the client-side bucketing).
export async function getDepositTrend(days = 7): Promise<TrendPoint[]> {
  await requireRole("admin");
  return db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${transactions.createdAt}), 'YYYY-MM-DD')`,
      total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.kind, "deposit"),
        sql`${transactions.createdAt} >= now() - make_interval(days => ${days})`,
      ),
    )
    .groupBy(sql`date_trunc('day', ${transactions.createdAt})`)
    .orderBy(sql`date_trunc('day', ${transactions.createdAt})`);
}
