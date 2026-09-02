import { redirect } from "next/navigation";
import { getAgentContext, type AgentContext } from "@/lib/data/agent";
import { countMyUnread, listMyNotifications } from "@/lib/data/inapp";
import AgentShell from "@/components/agent/AgentShell";
import SignOutButton from "@/components/SignOutButton";
import { formatNgPhone } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  let ctx: AgentContext;
  try {
    ctx = await getAgentContext();
  } catch {
    redirect("/login");
  }

  if (ctx.approvalStatus !== "active") {
    return <PendingGate ctx={ctx} />;
  }

  const [notifications, unread] = await Promise.all([listMyNotifications(), countMyUnread()]);

  return (
    <AgentShell businessName={ctx.businessName} notifications={notifications} unread={unread}>
      {children}
    </AgentShell>
  );
}

const GATE_COPY: Record<string, { title: string; body: string; badge: string }> = {
  pending_approval: {
    title: "Pending approval",
    body: "Your agent account has been submitted and is awaiting review by an admin. You will be able to onboard savers once approved.",
    badge: "gold",
  },
  suspended: {
    title: "Account suspended",
    body: "Your agent account has been suspended. Please contact an administrator.",
    badge: "coral",
  },
  rejected: {
    title: "Application not approved",
    body: "Your agent application was not approved. Please contact an administrator for details.",
    badge: "coral",
  },
};

function PendingGate({ ctx }: { ctx: AgentContext }) {
  const copy = GATE_COPY[ctx.approvalStatus] ?? GATE_COPY.pending_approval;
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "hsl(var(--bg-dark))",
        color: "hsl(var(--text-primary))",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div className="glass-card" style={{ width: 400, maxWidth: "100%", textAlign: "center" }}>
        <span className={`badge ${copy.badge}`} style={{ marginBottom: 12 }}>
          {ctx.approvalStatus.replace("_", " ")}
        </span>
        <h1 style={{ fontSize: 22, margin: "8px 0" }}>{copy.title}</h1>
        <p style={{ color: "hsl(var(--text-secondary))", fontSize: 14, marginBottom: 16 }}>{copy.body}</p>
        <div
          style={{
            textAlign: "left",
            background: "rgba(255,255,255,0.03)",
            borderRadius: 10,
            padding: 14,
            marginBottom: 18,
            fontSize: 14,
          }}
        >
          <Row label="Business" value={ctx.businessName} />
          <Row label="Agent" value={ctx.fullName} />
          <Row label="Phone" value={formatNgPhone(ctx.phone)} />
        </div>
        <SignOutButton style={{ width: "100%" }} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
      <span style={{ color: "hsl(var(--text-muted))" }}>{label}</span>
      <span style={{ color: "hsl(var(--text-primary))", fontWeight: 600 }}>{value || "—"}</span>
    </div>
  );
}
