import { listNotifications } from "@/lib/data/notifications";
import { formatDateTime } from "@/lib/format";
import { KpiCard } from "@/components/admin/KpiCard";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  sent: "emerald",
  delivered: "emerald",
  pending: "gold",
  failed: "coral",
};

export default async function NotificationsPage() {
  const rows = await listNotifications();
  const total = rows.length;
  const delivered = rows.filter((r) => r.status === "sent" || r.status === "delivered").length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const successRate = total ? Math.round((delivered / total) * 100) : 0;

  return (
    <div className="animate-fade-in">
      <h1 style={{ marginTop: 0, marginBottom: 20, fontSize: 24 }}>Notification Logs</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <KpiCard title="Total Sent" value={String(total)} accent="cobalt" />
        <KpiCard title="Delivered" value={String(delivered)} accent="emerald" />
        <KpiCard title="Failed" value={String(failed)} accent="coral" />
        <KpiCard title="Success Rate" value={`${successRate}%`} accent="gold" />
      </div>

      <div className="glass-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Template</th>
              <th>Recipient</th>
              <th>Channel</th>
              <th>Status</th>
              <th>Sent</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "hsl(var(--text-muted))" }}>
                  No notifications yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ color: "hsl(var(--text-primary))" }}>{r.templateName}</td>
                <td>
                  {r.participantName ?? r.agentName ?? "—"}
                  {r.participantPhone && (
                    <span style={{ color: "hsl(var(--text-muted))" }}> · {r.participantPhone}</span>
                  )}
                </td>
                <td>{r.channel ?? "—"}</td>
                <td>
                  <span className={`badge ${STATUS_BADGE[r.status] ?? "muted"}`}>{r.status}</span>
                  {r.errorCode && (
                    <span style={{ color: "hsl(var(--accent-coral))", fontSize: 12 }}> · {r.errorCode}</span>
                  )}
                </td>
                <td>{formatDateTime(r.sentAt ?? r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
