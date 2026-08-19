import { listMyDisputes } from "@/lib/data/participant";
import { formatDateTime, formatNaira } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ParticipantDisputesPage() {
  const disputes = await listMyDisputes();
  const open = disputes.filter((d) => d.status === "open");
  const resolved = disputes.filter((d) => d.status === "resolved");

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h1 style={{ fontSize: 20, margin: 0 }}>Disputes</h1>

      {disputes.length === 0 && (
        <div className="glass-card" style={{ padding: 16, color: "hsl(var(--text-muted))", fontSize: 14 }}>
          You have no disputes. To report an issue, open a savings plan and tap “Report an issue with a deposit”.
        </div>
      )}

      <Group title={`Open (${open.length})`} rows={open} />
      <Group title={`Resolved (${resolved.length})`} rows={resolved} />
    </div>
  );
}

function Group({
  title,
  rows,
}: {
  title: string;
  rows: Awaited<ReturnType<typeof listMyDisputes>>;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <h2 style={{ fontSize: 14, color: "hsl(var(--text-secondary))", marginBottom: 10 }}>{title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((d) => (
          <div key={d.id} className="glass-card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span className={`badge ${d.status === "open" ? "coral" : "emerald"}`}>{d.status}</span>
              <span style={{ color: "hsl(var(--text-muted))", fontSize: 12 }}>{formatDateTime(d.createdAt)}</span>
            </div>
            <p style={{ color: "hsl(var(--text-secondary))", margin: "4px 0", fontSize: 14 }}>{d.reason}</p>
            <div style={{ color: "hsl(var(--text-muted))", fontSize: 12 }}>
              {d.agentName} · {formatNaira(d.txAmount)} (day {d.txDay})
            </div>
            {d.resolutionNote && (
              <p style={{ color: "hsl(var(--text-secondary))", fontSize: 13, marginTop: 8, marginBottom: 0 }}>
                <strong style={{ color: "hsl(var(--text-primary))" }}>Response:</strong> {d.resolutionNote}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
