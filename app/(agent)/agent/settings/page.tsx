import { getAgentContext } from "@/lib/data/agent";
import SignOutButton from "@/components/SignOutButton";
import { formatNgPhone } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AgentSettingsPage() {
  const ctx = await getAgentContext();

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h1 style={{ fontSize: 20, margin: 0 }}>Settings</h1>

      <div className="glass-card" style={{ padding: 16 }}>
        <Row label="Business" value={ctx.businessName} />
        <Row label="Agent" value={ctx.fullName} />
        <Row label="Phone" value={formatNgPhone(ctx.phone)} />
        <Row label="Status" value={ctx.approvalStatus.replace("_", " ")} />
        <Row label="Version" value="v3 · Next.js" />
      </div>

      <SignOutButton
        style={{
          width: "100%",
          padding: 14,
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.15)",
          color: "#EF4444",
          fontWeight: 600,
        }}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: "1px solid hsl(var(--border-glass))",
        fontSize: 14,
      }}
    >
      <span style={{ color: "hsl(var(--text-muted))" }}>{label}</span>
      <span style={{ color: "hsl(var(--text-primary))", fontWeight: 600, textTransform: "capitalize" }}>
        {value || "—"}
      </span>
    </div>
  );
}
