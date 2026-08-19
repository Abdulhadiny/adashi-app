import { getAdminDashboardKpis, getDepositTrend } from "@/lib/data/admin";
import { formatNaira } from "@/lib/format";
import { KpiCard } from "@/components/admin/KpiCard";
import { TrendChart } from "@/components/admin/TrendChart";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const [kpis, trend] = await Promise.all([getAdminDashboardKpis(), getDepositTrend(7)]);

  return (
    <div className="animate-fade-in">
      <h1 style={{ marginTop: 0, marginBottom: 20, fontSize: 24 }}>Overview</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <KpiCard
          title="Gross Savings Volume"
          value={formatNaira(kpis.grossVolume)}
          subtext="All-time deposits"
          accent="emerald"
        />
        <KpiCard title="Active Agents" value={String(kpis.activeAgents)} subtext="Approved & active" accent="cobalt" />
        <KpiCard title="Participants" value={String(kpis.totalParticipants)} subtext="Registered savers" accent="gold" />
        <KpiCard title="Open Disputes" value={String(kpis.openDisputes)} subtext="Needing attention" accent="coral" />
        <KpiCard title="Commission Pool" value={formatNaira(kpis.commissionPool)} subtext="Across all cycles" accent="gold" />
      </div>

      <div className="glass-card" style={{ marginTop: 20 }}>
        <div className="kpi-title" style={{ marginBottom: 16 }}>
          Deposits — last 7 days
        </div>
        <TrendChart data={trend} />
      </div>
    </div>
  );
}
