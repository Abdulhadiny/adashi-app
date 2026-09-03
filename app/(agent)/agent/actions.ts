"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  agentParticipants,
  cycles,
  disputes,
  participantProfiles,
  transactions,
  users,
} from "@/lib/db/schema";
import { lookupParticipantByPhone, requireActiveAgent } from "@/lib/data/agent";
import { isValidNgPhone, normalizeNgPhone } from "@/lib/auth/phone";
import { createNotification, notifyAdmins, recordAudit } from "@/lib/notifications/inapp";
import { formatNaira } from "@/lib/format";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

// Read-on-demand for the "Add saver" modal.
export async function lookupParticipantAction(phone: string) {
  return lookupParticipantByPhone(phone);
}

// ── Provision or link a participant (replaces register_or_link_participant RPC) ─
export async function registerOrLinkParticipantAction(input: {
  phone: string;
  fullName: string;
  nickname?: string;
}): Promise<Result<{ participantId: string; wasCreated: boolean }>> {
  const agent = await requireActiveAgent();
  const phone = normalizeNgPhone(input.phone);
  if (!isValidNgPhone(phone)) return { ok: false, error: "Enter a valid Nigerian phone number." };
  const fullName = input.fullName.trim();
  const nickname = input.nickname?.trim() || null;

  // Provision-or-link atomically. users.phone is UNIQUE across all roles, so two agents
  // registering the same new phone at once would otherwise race: one INSERT wins, the other
  // raises 23505. onConflictDoNothing + re-read resolves that into a clean link instead of an
  // unhandled error, and the transaction keeps the users/profile/link writes all-or-nothing.
  const outcome = await db.transaction(async (tx) => {
    // Find an existing participant by phone.
    let [participant] = await tx
      .select({ id: users.id, fullName: users.fullName, phone: users.phone })
      .from(users)
      .where(and(eq(users.phone, phone), eq(users.role, "participant")))
      .limit(1);

    let wasCreated = false;
    if (!participant) {
      if (!fullName) return { ok: false as const, error: "A name is required to register a new saver." };
      const [created] = await tx
        .insert(users)
        .values({ phone, fullName, role: "participant", status: "pending" })
        .onConflictDoNothing({ target: users.phone })
        .returning({ id: users.id, fullName: users.fullName, phone: users.phone });

      if (created) {
        participant = created;
        wasCreated = true;
        await tx.insert(participantProfiles).values({
          userId: created.id,
          nickname,
          registeredByAgentId: agent.userId,
        });
      } else {
        // Insert was a no-op: another agent won the race (or the phone already belongs to a
        // non-participant). Re-read to see who now owns it.
        [participant] = await tx
          .select({ id: users.id, fullName: users.fullName, phone: users.phone })
          .from(users)
          .where(and(eq(users.phone, phone), eq(users.role, "participant")))
          .limit(1);
      }
    }

    if (!participant) {
      // Phone is taken by a non-participant (agent/admin) — can't link them as a saver.
      return { ok: false as const, error: "That phone number is already in use." };
    }

    // agent_participants is the source of truth for "belongs to" — ensure an active link.
    await tx
      .insert(agentParticipants)
      .values({ agentId: agent.userId, participantId: participant.id, status: "active" })
      .onConflictDoUpdate({
        target: [agentParticipants.agentId, agentParticipants.participantId],
        set: { status: "active" },
      });

    return { ok: true as const, participant, wasCreated };
  });

  if (!outcome.ok) return outcome;

  // Side effects run only after the transaction commits. Notifications + audit fire
  // only for a genuinely new registration — re-linking an existing saver is silent.
  if (outcome.wasCreated) {
    await createNotification({
      recipientId: outcome.participant.id,
      type: "onboarding",
      title: "Welcome to Adashi",
      body: `You have been registered by ${agent.fullName}. Your savings journey starts now.`,
    });
    await notifyAdmins({
      type: "participant_registered",
      title: "New saver registered",
      body: `${outcome.participant.fullName} was registered by ${agent.fullName} (${agent.businessName}).`,
    });
    await recordAudit({
      actorId: agent.userId,
      action: "participant_registered",
      entityType: "participant",
      entityId: outcome.participant.id,
      summary: `${agent.fullName} registered saver ${outcome.participant.fullName}`,
    });
  }

  revalidatePath("/agent/participants");
  revalidatePath("/agent");
  return { ok: true, participantId: outcome.participant.id, wasCreated: outcome.wasCreated };
}

// ── Start a savings cycle ─────────────────────────────────────────────────────
export async function startCycleAction(input: {
  participantId: string;
  dailyAmount: number;
}): Promise<Result<{ cycleId: string }>> {
  const agent = await requireActiveAgent();
  const amount = Number(input.dailyAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter a valid daily amount." };
  }

  const [link] = await db
    .select({ id: agentParticipants.participantId })
    .from(agentParticipants)
    .where(
      and(
        eq(agentParticipants.agentId, agent.userId),
        eq(agentParticipants.participantId, input.participantId),
        eq(agentParticipants.status, "active"),
      ),
    )
    .limit(1);
  if (!link) return { ok: false, error: "This saver is not linked to you." };

  const [existingActive] = await db
    .select({ id: cycles.id })
    .from(cycles)
    .where(
      and(
        eq(cycles.agentId, agent.userId),
        eq(cycles.participantId, input.participantId),
        eq(cycles.status, "active"),
      ),
    )
    .limit(1);
  if (existingActive) return { ok: false, error: "This saver already has an active plan." };

  const [cycle] = await db
    .insert(cycles)
    .values({
      agentId: agent.userId,
      participantId: input.participantId,
      dailyAmount: amount.toFixed(2),
      status: "active",
    })
    .returning({ id: cycles.id });

  await createNotification({
    recipientId: input.participantId,
    type: "cycle_start",
    title: "New savings plan started",
    body: `${agent.fullName} started a ${formatNaira(amount)}/day savings plan for you.`,
  });

  revalidatePath("/agent/participants");
  revalidatePath("/agent");
  return { ok: true, cycleId: cycle.id };
}

// ── Record a daily deposit (amount is always the cycle's daily_amount) ─────────
export interface DepositReceipt {
  participantName: string;
  participantPhone: string;
  amount: string;
  dayOfCycle: number;
  balance: string;
  transactionId: string;
  agentName: string;
  businessName: string;
  recordedAt: string;
}

export async function markDepositAction(input: {
  cycleId: string;
  dayOfCycle: number;
}): Promise<Result<{ receipt: DepositReceipt }>> {
  const agent = await requireActiveAgent();
  const day = Number(input.dayOfCycle);
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return { ok: false, error: "Invalid day." };
  }

  const [cycle] = await db
    .select({
      id: cycles.id,
      status: cycles.status,
      dailyAmount: cycles.dailyAmount,
      participantId: cycles.participantId,
      participantName: users.fullName,
      participantPhone: users.phone,
    })
    .from(cycles)
    .innerJoin(users, eq(users.id, cycles.participantId))
    .where(and(eq(cycles.id, input.cycleId), eq(cycles.agentId, agent.userId)))
    .limit(1);
  if (!cycle) return { ok: false, error: "Plan not found." };
  if (cycle.status !== "active") return { ok: false, error: "This plan is closed." };

  let tx;
  try {
    [tx] = await db
      .insert(transactions)
      .values({
        cycleId: cycle.id,
        kind: "deposit",
        dayOfCycle: day,
        amount: cycle.dailyAmount,
      })
      .returning({ id: transactions.id, createdAt: transactions.createdAt });
  } catch (e) {
    // unique (cycle_id, kind, day_of_cycle) violation → day already paid.
    // drizzle wraps the driver error, so the pg code can be on e.code OR e.cause.code.
    const code = (e as { code?: string }).code ?? (e as { cause?: { code?: string } }).cause?.code;
    if (code === "23505") return { ok: false, error: `Day ${day} is already paid.` };
    throw e;
  }

  // Balance after this deposit (sum of all deposits so far).
  const [{ total }] = await db
    .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .where(and(eq(transactions.cycleId, cycle.id), eq(transactions.kind, "deposit")));

  await createNotification({
    recipientId: cycle.participantId,
    type: "deposit",
    title: "Deposit recorded",
    body: `${agent.fullName} recorded your ${formatNaira(cycle.dailyAmount)} deposit for day ${day}. Balance: ${formatNaira(total)}.`,
  });

  revalidatePath(`/agent/cycles/${cycle.id}`);
  revalidatePath("/agent");

  return {
    ok: true,
    receipt: {
      participantName: cycle.participantName,
      participantPhone: cycle.participantPhone,
      amount: cycle.dailyAmount,
      dayOfCycle: day,
      balance: total,
      transactionId: tx.id,
      agentName: agent.fullName,
      businessName: agent.businessName,
      recordedAt: tx.createdAt.toISOString(),
    },
  };
}

// ── Close a cycle (commission = min(chosen, total); payout = max(0, total − commission)) ─
export async function closeCycleAction(input: {
  cycleId: string;
  manualCommission?: number;
}): Promise<Result> {
  const agent = await requireActiveAgent();

  const [cycle] = await db
    .select({
      id: cycles.id,
      status: cycles.status,
      dailyAmount: cycles.dailyAmount,
      participantId: cycles.participantId,
      participantName: users.fullName,
      participantPhone: users.phone,
    })
    .from(cycles)
    .innerJoin(users, eq(users.id, cycles.participantId))
    .where(and(eq(cycles.id, input.cycleId), eq(cycles.agentId, agent.userId)))
    .limit(1);
  if (!cycle) return { ok: false, error: "Plan not found." };
  if (cycle.status !== "active") return { ok: false, error: "This plan is already closed." };

  const deposits = await db
    .select({ amount: transactions.amount })
    .from(transactions)
    .where(and(eq(transactions.cycleId, cycle.id), eq(transactions.kind, "deposit")));
  const totalDeposited = deposits.reduce((s, d) => s + Number(d.amount), 0);
  const daysPaid = deposits.length;

  const isEarlyClose = daysPaid < 15;
  const chosen = isEarlyClose ? Number(input.manualCommission) : Number(cycle.dailyAmount);
  if (isEarlyClose && (!Number.isFinite(chosen) || chosen < 0)) {
    return { ok: false, error: "Enter a valid negotiated commission amount." };
  }
  const commission = Math.min(chosen, totalDeposited);
  const payout = Math.max(0, totalDeposited - commission);

  await db
    .update(cycles)
    .set({
      status: "closed",
      commission: commission.toFixed(2),
      payoutAmount: payout.toFixed(2),
      endDate: new Date().toISOString().slice(0, 10),
    })
    .where(eq(cycles.id, cycle.id));

  await createNotification({
    recipientId: cycle.participantId,
    type: "cycle_close",
    title: "Savings plan closed",
    body: `${agent.fullName} closed your savings plan. Your payout of ${formatNaira(payout.toFixed(2))} is ready.`,
  });

  revalidatePath(`/agent/cycles/${cycle.id}`);
  revalidatePath("/agent/participants");
  revalidatePath("/agent");
  return { ok: true };
}

// ── Resolve a dispute (agent side): verdict is prefixed into the note ──────────
export async function resolveDisputeAgentAction(input: {
  id: string;
  accepted: boolean;
  note: string;
}): Promise<Result> {
  const agent = await requireActiveAgent();
  const note = input.note.trim();
  if (!note) return { ok: false, error: "A resolution note is required." };

  const [dispute] = await db
    .select({ id: disputes.id, status: disputes.status })
    .from(disputes)
    .where(and(eq(disputes.id, input.id), eq(disputes.agentId, agent.userId)))
    .limit(1);
  if (!dispute) return { ok: false, error: "Dispute not found." };
  if (dispute.status !== "open") return { ok: false, error: "Dispute already resolved." };

  const resolutionText = `${input.accepted ? "[Accepted]" : "[Rejected]"} ${note}`;
  await db
    .update(disputes)
    .set({ status: "resolved", resolutionNote: resolutionText, resolvedAt: new Date() })
    .where(eq(disputes.id, input.id));

  revalidatePath("/agent/disputes");
  revalidatePath("/agent");
  return { ok: true };
}
