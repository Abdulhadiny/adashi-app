import { listAuditLog, type AuditLogRow } from "@/lib/data/approvals";
import { formatDateTime } from "@/lib/format";
import { KpiCard } from "@/components/admin/KpiCard";

export const dynamic = "force-dynamic";

const ACTION_META: Record<string, { label: string; badge: string }> = {
  agent_approved: { label: "approved", badge: "emerald" },
  agent_rejected: { label: "rejected", badge: "coral" },
  agent_suspended: { label: "suspended", badge: "coral" },
  agent_activated: { label: "activated", badge: "emerald" },
  participant_registered: { label: "registered", badge: "gold" },
};

function meta(action: string) {
  return ACTION_META[action] ?? { label: action.replace(/_/g, " "), badge: "muted" };
}

export default async function AuditPage() {
  const rows: AuditLogRow[] = await listAuditLog();
  const total = rows.length;
  const approvals = rows.filter((r) => r.action === "agent_approved").length;
  const suspensions = rows.filter((r) => r.action === "agent_suspended").length;
  const registrations = rows.filter((r) => r.action === "participant_registered").length;

  return (
    <div className="animate-fade-in">
      <h1 style={{ marginTop: 0, marginBottom: 20, fontSize: 24 }}>Audit Logs</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <KpiCard title="Total Events" value={String(total)} accent="cobalt" />
        <KpiCard title="Approvals" value={String(approvals)} accent="emerald" />
        <KpiCard title="Suspensions" value={String(suspensions)} accent="coral" />
        <KpiCard title="Registrations" value={String(registrations)} accent="gold" />
      </div>

      <div className="glass-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>Subject</th>
              <th>Details</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "hsl(var(--text-muted))" }}>
                  No audit events yet.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const m = meta(r.action);
              return (
                <tr key={r.id}>
                  <td>{formatDateTime(r.createdAt)}</td>
                  <td>
                    <span className={`badge ${m.badge}`}>{m.label}</span>
                  </td>
                  <td style={{ color: "hsl(var(--text-primary))" }}>
                    {r.entityName ?? "—"}
                    <span style={{ color: "hsl(var(--text-muted))", fontSize: 12 }}> · {r.entityType}</span>
                  </td>
                  <td style={{ color: "hsl(var(--text-secondary))" }}>
                    {r.summary}
                    {r.note && (
                      <span style={{ display: "block", color: "hsl(var(--text-muted))", fontSize: 12 }}>{r.note}</span>
                    )}
                  </td>
                  <td>{r.actorName ?? "System"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
