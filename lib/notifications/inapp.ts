// In-app notification + audit-log writers (server-only). These replace the old
// outbound WhatsApp/SMS dispatch seam: instead of sending a message, we persist a
// row the recipient sees in their in-app notification bell. Called from server
// actions after a successful mutation (guard → mutate → revalidate → notify).
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLog, inAppNotifications, users } from "@/lib/db/schema";

export interface NewInAppInput {
  recipientId: string;
  type: string;
  title: string;
  body: string;
  href?: string | null;
}

/** Write one in-app notification for a single recipient. */
export async function createNotification(input: NewInAppInput) {
  await db.insert(inAppNotifications).values({
    recipientId: input.recipientId,
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href ?? null,
  });
}

/** Fan out one in-app notification to every admin (agent/participant registrations). */
export async function notifyAdmins(input: Omit<NewInAppInput, "recipientId">) {
  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
  if (admins.length === 0) return;
  await db.insert(inAppNotifications).values(
    admins.map((a) => ({
      recipientId: a.id,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
    })),
  );
}

export interface AuditInput {
  actorId?: string | null;
  action: string;
  entityType: "agent" | "participant";
  entityId?: string | null;
  summary: string;
  note?: string | null;
}

/** Append one row to the general audit trail. actorId null = system action. */
export async function recordAudit(input: AuditInput) {
  await db.insert(auditLog).values({
    actorId: input.actorId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    summary: input.summary,
    note: input.note ?? null,
  });
}
