import { formatNaira } from "@/lib/format";
import type { TrendPoint } from "@/lib/data/admin";

// Inline-SVG area/line chart (no chart lib), server-rendered from daily totals.
export function TrendChart({ data }: { data: TrendPoint[] }) {
  const W = 720;
  const H = 220;
  const pad = { top: 16, right: 16, bottom: 28, left: 16 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  if (!data.length) {
    return <div style={{ color: "hsl(var(--text-muted))", fontSize: 14 }}>No deposits yet.</div>;
  }

  const values = data.map((d) => Number(d.total) || 0);
  const max = Math.max(...values, 1);
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

  const points = values.map((v, i) => {
    const x = pad.left + (data.length > 1 ? i * stepX : innerW / 2);
    const y = pad.top + innerH - (v / max) * innerH;
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath =
    `M ${points[0].x} ${pad.top + innerH} ` +
    points.map((p) => `L ${p.x} ${p.y}`).join(" ") +
    ` L ${points[points.length - 1].x} ${pad.top + innerH} Z`;

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 480, display: "block" }} role="img">
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4C82E0" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4C82E0" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#trend-fill)" />
        <path d={linePath} fill="none" stroke="#4C82E0" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3.5} fill="#4C82E0" />
            <text
              x={p.x}
              y={H - 10}
              textAnchor="middle"
              fontSize={11}
              fill="hsl(var(--text-muted))"
            >
              {data[i].day.slice(5)}
            </text>
          </g>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
        {data.map((d) => (
          <span key={d.day} style={{ fontSize: 12, color: "hsl(var(--text-secondary))" }}>
            {d.day.slice(5)}: <strong style={{ color: "hsl(var(--text-primary))" }}>{formatNaira(d.total)}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}
