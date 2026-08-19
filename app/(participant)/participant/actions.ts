"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cycles, disputes, transactions } from "@/lib/db/schema";
import { requireRole } from "@/lib/data/session";

// A saver raises a dispute about a specific recorded deposit. The dispute's agent
// is derived from the deposit's cycle; ownership is verified against the session.
export async function raiseDisputeAction(input: {
  transactionId: string;
  reason: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await requireRole("participant");
  const reason = input.reason.trim();
  if (!reason) return { ok: false, error: "Please describe the issue." };

  const [row] = await db
    .select({ agentId: cycles.agentId, participantId: cycles.participantId })
    .from(transactions)
    .innerJoin(cycles, eq(cycles.id, transactions.cycleId))
    .where(eq(transactions.id, input.transactionId))
    .limit(1);
  if (!row || row.participantId !== userId) {
    return { ok: false, error: "That deposit could not be found." };
  }

  await db.insert(disputes).values({
    transactionId: input.transactionId,
    participantId: userId,
    agentId: row.agentId,
    reason,
    status: "open",
  });

  revalidatePath("/participant/disputes");
  revalidatePath("/participant");
  return { ok: true };
}
