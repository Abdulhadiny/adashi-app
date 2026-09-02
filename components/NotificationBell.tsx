"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { timeAgo } from "@/lib/format";
import type { MyNotification } from "@/lib/data/inapp";
import {
  markMyNotificationReadAction,
  markMyNotificationsReadAction,
} from "@/lib/notifications/actions";

export default function NotificationBell({
  items,
  unread,
}: {
  items: MyNotification[];
  unread: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  function markAll() {
    if (unread === 0) return;
    startTransition(async () => {
      await markMyNotificationsReadAction();
      router.refresh();
    });
  }

  function openItem(item: MyNotification) {
    setOpen(false);
    startTransition(async () => {
      if (!item.readAt) await markMyNotificationReadAction(item.id);
      if (item.href) router.push(item.href);
      else router.refresh();
    });
  }

  return (
    <div style={{ position: "relative", display: "flex" }}>
      <button
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "relative",
          background: "transparent",
          border: "none",
          color: "hsl(var(--text-secondary))",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          padding: 6,
          borderRadius: 8,
        }}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -1,
              right: -1,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              borderRadius: 999,
              background: "hsl(var(--accent-coral))",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 300, background: "transparent" }}
          />
          <div
            className="glass-card"
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              zIndex: 320,
              width: "min(340px, calc(100vw - 32px))",
              maxHeight: "70vh",
              overflowY: "auto",
              padding: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderBottom: "1px solid hsl(var(--border-glass))",
                position: "sticky",
                top: 0,
                background: "hsl(var(--bg-card))",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
              <button
                onClick={markAll}
                disabled={unread === 0}
                style={{
                  background: "transparent",
                  border: "none",
                  color: unread === 0 ? "hsl(var(--text-muted))" : "hsl(var(--brand-fg))",
                  cursor: unread === 0 ? "default" : "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "inherit",
                }}
              >
                Mark all read
              </button>
            </div>

            {items.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "hsl(var(--text-muted))", fontSize: 13 }}>
                No notifications yet.
              </div>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {items.map((item) => {
                  const isUnread = !item.readAt;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => openItem(item)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          background: isUnread ? "hsl(var(--brand-fg) / 0.06)" : "transparent",
                          border: "none",
                          borderBottom: "1px solid hsl(var(--border-glass))",
                          padding: "12px 14px",
                          cursor: item.href ? "pointer" : "default",
                          display: "flex",
                          gap: 10,
                          fontFamily: "inherit",
                        }}
                      >
                        <span
                          style={{
                            marginTop: 6,
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            flexShrink: 0,
                            background: isUnread ? "hsl(var(--accent-coral))" : "transparent",
                          }}
                        />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 8,
                              alignItems: "baseline",
                            }}
                          >
                            <span style={{ fontWeight: 600, fontSize: 13, color: "hsl(var(--text-primary))" }}>
                              {item.title}
                            </span>
                            <span style={{ fontSize: 11, color: "hsl(var(--text-muted))", flexShrink: 0 }}>
                              {timeAgo(item.createdAt)}
                            </span>
                          </span>
                          <span
                            style={{
                              display: "block",
                              marginTop: 2,
                              fontSize: 12,
                              color: "hsl(var(--text-secondary))",
                              lineHeight: 1.4,
                            }}
                          >
                            {item.body}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
