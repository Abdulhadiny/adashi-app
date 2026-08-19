import { getParticipantContext } from "@/lib/data/participant";
import SignOutButton from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function ParticipantSettingsPage() {
  const ctx = await getParticipantContext();

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h1 style={{ fontSize: 20, margin: 0 }}>Settings</h1>

      <div className="glass-card" style={{ padding: 16 }}>
        <Row label="Name" value={ctx.fullName} />
        {ctx.nickname && <Row label="Nickname" value={ctx.nickname} />}
        <Row label="Phone" value={ctx.phone} />
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
      <span style={{ color: "hsl(var(--text-primary))", fontWeight: 600 }}>{value || "—"}</span>
    </div>
  );
}
