import Link from "next/link";
import { getParticipantSummary, listMyPlans } from "@/lib/data/participant";
import { formatNaira } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ParticipantHomePage() {
  const [summary, plans] = await Promise.all([getParticipantSummary(), listMyPlans()]);

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="glass-card kpi-card emerald">
        <div className="kpi-title">Total saved</div>
        <div className="kpi-value">{formatNaira(summary.totalSaved)}</div>
        <div className="kpi-subtext">
          {summary.activePlans} active plan{summary.activePlans === 1 ? "" : "s"}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 15, color: "hsl(var(--text-secondary))", margin: "4px 0 10px" }}>Your plans</h2>
        {plans.length === 0 ? (
          <div className="glass-card" style={{ padding: 16, color: "hsl(var(--text-muted))", fontSize: 14 }}>
            You don&apos;t have any savings plans yet. Your agent will set one up for you.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {plans.map((p) => (
              <Link key={p.id} href={`/participant/cycles/${p.id}`} className="glass-card" style={{ padding: 16, display: "block" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "hsl(var(--text-primary))" }}>
                      {p.agentBusiness ?? p.agentName}
                    </div>
                    <div style={{ color: "hsl(var(--text-muted))", fontSize: 13 }}>
                      {formatNaira(p.dailyAmount)}/day · {p.daysPaid}/31 days
                    </div>
                  </div>
                  <span className={`badge ${p.status === "active" ? "emerald" : "muted"}`}>{p.status}</span>
                </div>
                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: 12,
                    borderTop: "1px solid hsl(var(--border-glass))",
                  }}
                >
                  <span style={{ color: "hsl(var(--text-secondary))", fontSize: 13 }}>
                    {p.status === "closed" ? "Payout" : "Saved so far"}
                  </span>
                  <strong style={{ color: "hsl(var(--accent-emerald))", fontSize: 18 }}>
                    {formatNaira(p.status === "closed" ? p.payoutAmount : p.totalDeposited)}
                  </strong>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
