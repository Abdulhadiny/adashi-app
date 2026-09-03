// Session-scoped in-app notification reads. Like every lib/data function, the
// caller is resolved from the session (never passed in) so a user only ever sees
// their own notifications.
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { inAppNotifications } from "@/lib/db/schema";
import { getSessionOrThrow } from "./session";

export async function listMyNotifications(limit = 10) {
  const { userId } = await getSessionOrThrow();
  return db
    .select({
      id: inAppNotifications.id,
      type: inAppNotifications.type,
      title: inAppNotifications.title,
      body: inAppNotifications.body,
      href: inAppNotifications.href,
      readAt: inAppNotifications.readAt,
      createdAt: inAppNotifications.createdAt,
    })
    .from(inAppNotifications)
    .where(eq(inAppNotifications.recipientId, userId))
    .orderBy(desc(inAppNotifications.createdAt))
    .limit(limit);
}

export async function countMyUnread() {
  const { userId } = await getSessionOrThrow();
  const [{ unread }] = await db
    .select({ unread: count() })
    .from(inAppNotifications)
    .where(and(eq(inAppNotifications.recipientId, userId), isNull(inAppNotifications.readAt)));
  return unread;
}

export type MyNotification = Awaited<ReturnType<typeof listMyNotifications>>[number];
