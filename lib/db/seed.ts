// Idempotent dev seed. Run: npm run db:seed  (Docker Postgres must be up + migrated)
// Seeded active users get PIN 123456 for instant login; the pending participant
// gets none (demoing first-OTP activation). OTP codes print to the dev console.
import "dotenv/config";
import { eq, inArray, isNull, and } from "drizzle-orm";
import { db } from "./client";
import {
  agentParticipants,
  agentProfiles,
  cycles,
  disputes,
  notifications,
  participantProfiles,
  transactions,
  users,
} from "./schema";
import { normalizeNgPhone } from "../auth/phone";
import { hashPin } from "../auth/pin";

const ADMIN_PHONE = normalizeNgPhone("08000000001");
const AGENT1_PHONE = normalizeNgPhone("08000000002");
const AGENT2_PHONE = normalizeNgPhone("08000000003");
const P1_PHONE = normalizeNgPhone("08000000004");
const P2_PHONE = normalizeNgPhone("08000000005");

const SEED_PIN = "123456";
// p2 stays PIN-less on purpose: pending participants activate via first OTP.
const PIN_PHONES = [ADMIN_PHONE, AGENT1_PHONE, AGENT2_PHONE, P1_PHONE];

async function main() {
  const [existingAdmin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phone, ADMIN_PHONE))
    .limit(1);

  if (existingAdmin) {
    // Backfill PINs on databases seeded before PIN login existed.
    const backfilled = await db
      .update(users)
      .set({ pinHash: hashPin(SEED_PIN) })
      .where(and(inArray(users.phone, PIN_PHONES), isNull(users.pinHash)))
      .returning({ id: users.id });
    console.log(
      `\nAlready seeded. Log in as admin with phone: ${ADMIN_PHONE} (PIN ${SEED_PIN}).` +
        (backfilled.length ? ` Backfilled PINs for ${backfilled.length} user(s).` : "") +
        `\n`,
    );
    return;
  }

  // Admin
  await db.insert(users).values({
    phone: ADMIN_PHONE,
    fullName: "Adashi Admin",
    role: "admin",
    status: "active",
    pinHash: hashPin(SEED_PIN),
  });

  // Two pending-approval agents (so the Approvals queue is non-empty)
  const [agent1] = await db
    .insert(users)
    .values({
      phone: AGENT1_PHONE,
      fullName: "Chidi Okafor",
      role: "agent",
      status: "active",
      pinHash: hashPin(SEED_PIN),
    })
    .returning({ id: users.id });
  await db.insert(agentProfiles).values({
    userId: agent1.id,
    businessName: "Okafor Savings Co.",
    approvalStatus: "pending_approval",
  });

  const [agent2] = await db
    .insert(users)
    .values({
      phone: AGENT2_PHONE,
      fullName: "Amina Bello",
      role: "agent",
      status: "active",
      pinHash: hashPin(SEED_PIN),
    })
    .returning({ id: users.id });
  await db.insert(agentProfiles).values({
    userId: agent2.id,
    businessName: "Bello Thrift & Credit",
    approvalStatus: "pending_approval",
  });

  // Participants: one active (with savings activity), one pending (activates on first OTP)
  const [p1] = await db
    .insert(users)
    .values({
      phone: P1_PHONE,
      fullName: "Ngozi Eze",
      role: "participant",
      status: "active",
      pinHash: hashPin(SEED_PIN),
    })
    .returning({ id: users.id });
  await db.insert(participantProfiles).values({
    userId: p1.id,
    nickname: "Ngozi",
    registeredByAgentId: agent1.id,
  });

  const [p2] = await db
    .insert(users)
    .values({ phone: P2_PHONE, fullName: "Tunde Balogun", role: "participant", status: "pending" })
    .returning({ id: users.id });
  await db.insert(participantProfiles).values({
    userId: p2.id,
    nickname: "Tunde",
    registeredByAgentId: agent1.id,
  });

  // Links (agent1 owns both participants)
  await db.insert(agentParticipants).values([
    { agentId: agent1.id, participantId: p1.id, status: "active" },
    { agentId: agent1.id, participantId: p2.id, status: "active" },
  ]);

  // A cycle for p1 with 5 daily deposits of ₦500
  const [cycle] = await db
    .insert(cycles)
    .values({
      agentId: agent1.id,
      participantId: p1.id,
      dailyAmount: "500",
      commission: "500",
      payoutAmount: "15000",
      status: "active",
    })
    .returning({ id: cycles.id });

  const txs = await db
    .insert(transactions)
    .values(
      [1, 2, 3, 4, 5].map((day) => ({
        cycleId: cycle.id,
        kind: "deposit" as const,
        dayOfCycle: day,
        amount: "500",
      })),
    )
    .returning({ id: transactions.id, dayOfCycle: transactions.dayOfCycle });

  // An open dispute on day 3, and a participant deposit notification
  const day3 = txs.find((t) => t.dayOfCycle === 3)!;
  await db.insert(disputes).values({
    transactionId: day3.id,
    participantId: p1.id,
    agentId: agent1.id,
    reason: "I paid on day 3 but it was not recorded on my card.",
    status: "open",
  });

  await db.insert(notifications).values({
    transactionId: txs[0].id,
    participantId: p1.id,
    agentId: agent1.id,
    channel: "whatsapp",
    templateName: "adashi_deposit_v1",
    templateParams: { message: "Your deposit of ₦500 was received." },
    status: "sent",
    sentAt: new Date(),
  });

  console.log(`
  Seeded successfully.
  ─────────────────────────────────────────────
  Admin login phone       : ${ADMIN_PHONE}
  Pending agent phones     : ${AGENT1_PHONE}, ${AGENT2_PHONE}
  Participant phones       : ${P1_PHONE} (active), ${P2_PHONE} (pending)
  PIN for seeded users     : ${SEED_PIN}  (${P2_PHONE} has none — first login is via OTP)
  ─────────────────────────────────────────────
  At /login sign in with phone + PIN, or use "one-time code" and read the OTP
  from the dev-server console.
`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
