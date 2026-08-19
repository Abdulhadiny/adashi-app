import Link from "next/link";
import { getMyCycles } from "@/lib/data/agent";
import { formatDate, formatNaira } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AgentHistoryPage() {
  const cycles = await getMyCycles("closed");

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h1 style={{ fontSize: 20, margin: 0 }}>History</h1>

      {cycles.length === 0 && (
        <div className="glass-card" style={{ padding: 16, color: "hsl(var(--text-muted))", fontSize: 14 }}>
          No closed plans yet.
        </div>
      )}

      {cycles.map((c) => (
        <Link key={c.id} href={`/agent/cycles/${c.id}`} className="glass-card" style={{ padding: 16, display: "block" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <strong style={{ color: "hsl(var(--text-primary))" }}>{c.participantName}</strong>
            <span style={{ color: "hsl(var(--text-muted))", fontSize: 12 }}>
              {formatDate(c.startDate)} → {formatDate(c.endDate)}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, fontSize: 13 }}>
            <Cell label="Daily" value={formatNaira(c.dailyAmount)} />
            <Cell label="Platform fee" value={formatNaira(c.commission)} />
            <Cell label="Net payout" value={formatNaira(c.payoutAmount)} accent />
          </div>
        </Link>
      ))}
    </div>
  );
}

function Cell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ color: "hsl(var(--text-muted))", fontSize: 11 }}>{label}</div>
      <div style={{ fontWeight: 700, color: accent ? "hsl(var(--accent-emerald))" : "hsl(var(--text-primary))" }}>
        {value}
      </div>
    </div>
  );
}
