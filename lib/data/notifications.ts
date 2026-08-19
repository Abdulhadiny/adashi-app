import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db/client";
import { notifications, users } from "@/lib/db/schema";
import { requireRole } from "./session";

const participant = alias(users, "participant");
const agent = alias(users, "agent");

// LEFT joins so agent-only rows (approval notifications, no participant) also show —
// fixes the old admin app's !inner join that hid them.
export async function listNotifications() {
  await requireRole("admin");
  return db
    .select({
      id: notifications.id,
      channel: notifications.channel,
      templateName: notifications.templateName,
      status: notifications.status,
      errorCode: notifications.errorCode,
      sentAt: notifications.sentAt,
      createdAt: notifications.createdAt,
      participantName: participant.fullName,
      participantPhone: participant.phone,
      agentName: agent.fullName,
    })
    .from(notifications)
    .leftJoin(participant, eq(participant.id, notifications.participantId))
    .leftJoin(agent, eq(agent.id, notifications.agentId))
    .orderBy(desc(notifications.createdAt));
}

export type NotificationRow = Awaited<ReturnType<typeof listNotifications>>[number];
