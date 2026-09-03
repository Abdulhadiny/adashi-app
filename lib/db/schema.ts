// Adashi — Drizzle schema (Postgres). Replaces the Supabase schema.sql + RLS model.
// Role is a column on `users`; access control is enforced in lib/data (server-side),
// not by RLS. Money columns are numeric(12,2) mapped to string (see MONEY note).

import { relations, sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// ── Enums ────────────────────────────────────────────────────────────────────
export const userRole = pgEnum("user_role", ["admin", "agent", "participant"]);
export const userStatus = pgEnum("user_status", ["pending", "active", "suspended"]);
export const agentApprovalStatus = pgEnum("agent_approval_status", [
  "pending_approval",
  "active",
  "suspended",
  "rejected",
]);
export const apStatus = pgEnum("ap_status", ["active", "inactive"]);
export const cycleStatus = pgEnum("cycle_status", ["active", "closed"]);
export const txKind = pgEnum("tx_kind", ["deposit", "withdrawal"]);
export const disputeStatus = pgEnum("dispute_status", ["open", "resolved"]);

// Shared column builders
const createdAt = timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = timestamp("updated_at", { withTimezone: true })
  .defaultNow()
  .notNull()
  .$onUpdate(() => new Date()); // replaces the SQL update_modified_column trigger

// ── users ────────────────────────────────────────────────────────────────────
// One row per real auth identity (admin, agent, OR participant). Phone is the
// login key and is unique for everyone (retires the old shared-phone model).
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull().unique(),
    fullName: text("full_name").notNull(),
    role: userRole("role").notNull(),
    status: userStatus("status").notNull().default("active"),
    // PIN login (set after first OTP-verified login; null = OTP-only so far).
    // "salt:hash" hex from lib/auth/pin. Lockout state lives here, not in a
    // separate table — a 6-digit PIN is only as strong as its attempt limit.
    pinHash: text("pin_hash"),
    pinFailedAttempts: integer("pin_failed_attempts").notNull().default(0),
    pinLockedUntil: timestamp("pin_locked_until", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (t) => [index("idx_users_role").on(t.role)],
);

// ── agent_profiles ──────────────────────────────────────────────────────────
export const agentProfiles = pgTable("agent_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  businessName: text("business_name").notNull(),
  approvalStatus: agentApprovalStatus("approval_status").notNull().default("pending_approval"),
  createdAt,
  updatedAt,
});

// ── participant_profiles ──────────────────────────────────────────────────────
export const participantProfiles = pgTable("participant_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  nickname: text("nickname"),
  photoUrl: text("photo_url"),
  registeredByAgentId: uuid("registered_by_agent_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  createdAt,
  updatedAt,
});

// ── agent_participants (M:N link, source of truth for who a participant belongs to)
export const agentParticipants = pgTable(
  "agent_participants",
  {
    agentId: uuid("agent_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: apStatus("status").notNull().default("active"),
    createdAt,
  },
  (t) => [
    primaryKey({ columns: [t.agentId, t.participantId] }),
    index("idx_ap_agent").on(t.agentId),
    index("idx_ap_participant").on(t.participantId),
  ],
);

// ── cycles ────────────────────────────────────────────────────────────────────
// MONEY: numeric(12,2) → JS string. Never Number()+Number(); sum in SQL.
export const cycles = pgTable(
  "cycles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    dailyAmount: numeric("daily_amount", { precision: 12, scale: 2 }).$type<string>().notNull(),
    status: cycleStatus("status").notNull().default("active"),
    startDate: date("start_date").notNull().default(sql`CURRENT_DATE`),
    endDate: date("end_date"),
    commission: numeric("commission", { precision: 12, scale: 2 })
      .$type<string>()
      .notNull()
      .default("0"),
    payoutAmount: numeric("payout_amount", { precision: 12, scale: 2 })
      .$type<string>()
      .notNull()
      .default("0"),
    createdAt,
    updatedAt,
  },
  (t) => [
    check("daily_amount_positive", sql`${t.dailyAmount} > 0`),
    index("idx_cycles_agent").on(t.agentId),
    index("idx_cycles_participant").on(t.participantId),
  ],
);

// ── transactions ──────────────────────────────────────────────────────────────
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cycleId: uuid("cycle_id")
      .notNull()
      .references(() => cycles.id, { onDelete: "cascade" }),
    kind: txKind("kind").notNull(),
    dayOfCycle: integer("day_of_cycle").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).$type<string>().notNull(),
    createdAt,
  },
  (t) => [
    unique("uq_cycle_day_kind").on(t.cycleId, t.kind, t.dayOfCycle),
    check("day_of_cycle_range", sql`${t.dayOfCycle} between 1 and 31`),
    index("idx_transactions_cycle").on(t.cycleId),
  ],
);

// ── in_app_notifications ──────────────────────────────────────────────────────
// In-app notification center (replaces the old outbound WhatsApp/SMS log). One row
// per recipient; `readAt` null = unread. `href` is an optional in-app deep link.
export const inAppNotifications = pgTable(
  "in_app_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt,
  },
  (t) => [
    index("idx_inapp_recipient_created").on(t.recipientId, t.createdAt.desc()),
    index("idx_inapp_unread")
      .on(t.recipientId)
      .where(sql`read_at is null`),
  ],
);

// ── disputes ──────────────────────────────────────────────────────────────────
export const disputes = pgTable(
  "disputes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "restrict" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    reason: text("reason").notNull(),
    status: disputeStatus("status").notNull().default("open"),
    resolutionNote: text("resolution_note"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt,
  },
  (t) => [index("idx_disputes_agent").on(t.agentId), index("idx_disputes_participant").on(t.participantId)],
);

// ── audit_log ─────────────────────────────────────────────────────────────────
// General admin/system audit trail (replaces the approvals-only agent_approvals_audit).
// `actorId` null = system. `action` is free text (e.g. agent_approved, agent_suspended,
// participant_registered). `entityType`/`entityId` point at the affected subject.
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    summary: text("summary").notNull(),
    note: text("note"),
    createdAt,
  },
  (t) => [
    index("idx_audit_created").on(t.createdAt.desc()),
    index("idx_audit_entity").on(t.entityType, t.entityId),
  ],
);

// ── otp_codes ─────────────────────────────────────────────────────────────────
export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt,
  },
  (t) => [index("idx_otp_phone_created").on(t.phone, t.createdAt.desc())],
);

// ── Relations (for the Drizzle relational query API) ──────────────────────────
export const usersRelations = relations(users, ({ one, many }) => ({
  agentProfile: one(agentProfiles, {
    fields: [users.id],
    references: [agentProfiles.userId],
  }),
  participantProfile: one(participantProfiles, {
    fields: [users.id],
    references: [participantProfiles.userId],
  }),
  agentLinks: many(agentParticipants, { relationName: "agentLinks" }),
  participantLinks: many(agentParticipants, { relationName: "participantLinks" }),
}));

export const agentProfilesRelations = relations(agentProfiles, ({ one }) => ({
  user: one(users, { fields: [agentProfiles.userId], references: [users.id] }),
}));

export const participantProfilesRelations = relations(participantProfiles, ({ one }) => ({
  user: one(users, { fields: [participantProfiles.userId], references: [users.id] }),
  registeredByAgent: one(users, {
    fields: [participantProfiles.registeredByAgentId],
    references: [users.id],
  }),
}));

export const agentParticipantsRelations = relations(agentParticipants, ({ one }) => ({
  agent: one(users, {
    fields: [agentParticipants.agentId],
    references: [users.id],
    relationName: "agentLinks",
  }),
  participant: one(users, {
    fields: [agentParticipants.participantId],
    references: [users.id],
    relationName: "participantLinks",
  }),
}));

export const cyclesRelations = relations(cycles, ({ one, many }) => ({
  agent: one(users, { fields: [cycles.agentId], references: [users.id] }),
  participant: one(users, { fields: [cycles.participantId], references: [users.id] }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  cycle: one(cycles, { fields: [transactions.cycleId], references: [cycles.id] }),
}));

export const disputesRelations = relations(disputes, ({ one }) => ({
  transaction: one(transactions, {
    fields: [disputes.transactionId],
    references: [transactions.id],
  }),
  participant: one(users, { fields: [disputes.participantId], references: [users.id] }),
  agent: one(users, { fields: [disputes.agentId], references: [users.id] }),
}));

export const inAppNotificationsRelations = relations(inAppNotifications, ({ one }) => ({
  recipient: one(users, { fields: [inAppNotifications.recipientId], references: [users.id] }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  actor: one(users, { fields: [auditLog.actorId], references: [users.id] }),
}));

// ── Inferred types ────────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AgentProfile = typeof agentProfiles.$inferSelect;
export type ParticipantProfile = typeof participantProfiles.$inferSelect;
export type AgentParticipant = typeof agentParticipants.$inferSelect;
export type Cycle = typeof cycles.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type InAppNotification = typeof inAppNotifications.$inferSelect;
export type NewInAppNotification = typeof inAppNotifications.$inferInsert;
export type Dispute = typeof disputes.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
export type OtpCode = typeof otpCodes.$inferSelect;

export type UserRole = (typeof userRole.enumValues)[number];
export type UserStatus = (typeof userStatus.enumValues)[number];
export type AgentApprovalStatus = (typeof agentApprovalStatus.enumValues)[number];
export type CycleStatus = (typeof cycleStatus.enumValues)[number];
export type TransactionKind = (typeof txKind.enumValues)[number];
export type DisputeStatus = (typeof disputeStatus.enumValues)[number];
