import Link from "next/link";
import { UserPlus, Wallet } from "lucide-react";
import { getAgentSummary } from "@/lib/data/agent";
import { formatNaira } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AgentHomePage() {
  const s = await getAgentSummary();

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="glass-card kpi-card emerald">
        <div className="kpi-title">Field Cash Collected</div>
        <div className="kpi-value">{formatNaira(s.fieldCash)}</div>
        <div className="kpi-subtext">Across all your savings plans</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="glass-card" style={{ padding: 16 }}>
          <div className="kpi-title">Active plans</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{s.activePlans}</div>
        </div>
        <div className="glass-card" style={{ padding: 16 }}>
          <div className="kpi-title">Savers linked</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{s.savers}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Link href="/agent/participants" className="btn btn-emerald" style={{ padding: "14px", fontSize: 14 }}>
          <UserPlus size={18} /> Link a saver
        </Link>
        <Link href="/agent/participants" className="btn btn-ghost" style={{ padding: "14px", fontSize: 14 }}>
          <Wallet size={18} /> Mark a card
        </Link>
      </div>

      <div className="glass-card" style={{ padding: 16 }}>
        <div className="kpi-title" style={{ marginBottom: 12 }}>
          Today&apos;s collections
        </div>
        {s.todaysDeposits.length === 0 ? (
          <p style={{ color: "hsl(var(--text-muted))", fontSize: 14 }}>No deposits recorded today.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {s.todaysDeposits.map((d) => (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: "hsl(var(--text-primary))", fontWeight: 600, fontSize: 14 }}>
                    {d.participantName}
                  </div>
                  <div style={{ color: "hsl(var(--text-muted))", fontSize: 12 }}>Day {d.dayOfCycle}</div>
                </div>
                <div style={{ color: "hsl(var(--accent-emerald))", fontWeight: 700 }}>+{formatNaira(d.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {s.openDisputes > 0 && (
        <Link href="/agent/disputes" className="glass-card" style={{ padding: 14, display: "block" }}>
          <span className="badge coral">{s.openDisputes} open dispute{s.openDisputes === 1 ? "" : "s"}</span>
        </Link>
      )}
    </div>
  );
}
