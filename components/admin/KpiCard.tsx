export function KpiCard({
  title,
  value,
  subtext,
  accent,
}: {
  title: string;
  value: string;
  subtext?: string;
  accent: "emerald" | "gold" | "coral" | "cobalt";
}) {
  return (
    <div className={`glass-card kpi-card ${accent}`}>
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">{value}</div>
      {subtext && <div className="kpi-subtext">{subtext}</div>}
    </div>
  );
}
