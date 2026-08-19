import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db/client";
import { disputes, transactions, users } from "@/lib/db/schema";
import { requireRole } from "./session";

const participant = alias(users, "participant");
const agent = alias(users, "agent");

export async function listDisputes() {
  await requireRole("admin");
  return db
    .select({
      id: disputes.id,
      reason: disputes.reason,
      status: disputes.status,
      resolutionNote: disputes.resolutionNote,
      resolvedAt: disputes.resolvedAt,
      createdAt: disputes.createdAt,
      participantName: participant.fullName,
      participantPhone: participant.phone,
      agentName: agent.fullName,
      txAmount: transactions.amount,
      txKind: transactions.kind,
      txDay: transactions.dayOfCycle,
    })
    .from(disputes)
    .innerJoin(transactions, eq(transactions.id, disputes.transactionId))
    .innerJoin(participant, eq(participant.id, disputes.participantId))
    .innerJoin(agent, eq(agent.id, disputes.agentId))
    .orderBy(desc(disputes.createdAt));
}

export type DisputeRow = Awaited<ReturnType<typeof listDisputes>>[number];

// Internal mutation used by the Disputes-page server action.
export async function resolveDisputeById(id: string, note: string) {
  await db
    .update(disputes)
    .set({ status: "resolved", resolutionNote: note, resolvedAt: new Date() })
    .where(eq(disputes.id, id));
}
