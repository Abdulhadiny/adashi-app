"use server";

// Client-callable mutations for the notification bell. Each self-authorizes from
// the session and scopes its UPDATE to the caller's own rows — a client-passed
// recipient is never trusted. The bell calls router.refresh() afterwards, which
// re-renders the server layouts that supply the unread count, so no revalidatePath.
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { inAppNotifications } from "@/lib/db/schema";
import { getSessionOrThrow } from "@/lib/data/session";

export async function markMyNotificationsReadAction(): Promise<void> {
  const { userId } = await getSessionOrThrow();
  await db
    .update(inAppNotifications)
    .set({ readAt: new Date() })
    .where(and(eq(inAppNotifications.recipientId, userId), isNull(inAppNotifications.readAt)));
}

export async function markMyNotificationReadAction(id: string): Promise<void> {
  const { userId } = await getSessionOrThrow();
  await db
    .update(inAppNotifications)
    .set({ readAt: new Date() })
    .where(and(eq(inAppNotifications.id, id), eq(inAppNotifications.recipientId, userId)));
}
