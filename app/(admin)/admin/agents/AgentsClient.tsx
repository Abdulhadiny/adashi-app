"use client";

import { useEffect, useState, useTransition } from "react";
import { formatDate, formatNaira, formatNgPhone } from "@/lib/format";
import type { AgentListItem } from "@/lib/data/agents";
import { useConfirm } from "@/components/ConfirmProvider";
import { getAgentDetailAction, setAgentStatusAction } from "./actions";

type AgentDetail = Awaited<ReturnType<typeof getAgentDetailAction>>;

// Directory only ever holds approved agents: active (Active) or suspended (Inactive).
const STATUS_META: Record<string, { label: string; badge: string }> = {
  active: { label: "Active", badge: "emerald" },
  suspended: { label: "Inactive", badge: "muted" },
};

export default function AgentsClient({ agents }: { agents: AgentListItem[] }) {
  const confirm = useConfirm();
  const [selected, setSelected] = useState<AgentListItem | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function toggleStatus(agent: AgentListItem) {
    const suspending = agent.approvalStatus === "active";
    const next = suspending ? "suspended" : "active";
    const ok = await confirm({
      title: suspending ? `Suspend ${agent.businessName}?` : `Activate ${agent.businessName}?`,
      message: suspending
        ? "The agent immediately loses access and can't collect deposits until reactivated."
        : "The agent regains access and can collect deposits again.",
      confirmLabel: suspending ? "Suspend" : "Activate",
      tone: suspending ? "danger" : "default",
    });
    if (!ok) return;
    setPendingId(agent.id);
    startTransition(async () => {
      try {
        await setAgentStatusAction(agent.id, next);
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="animate-fade-in">
      <h1 style={{ marginTop: 0, marginBottom: 20, fontSize: 24 }}>Agents Directory</h1>

      <div className="glass-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Business</th>
              <th>Agent</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Joined</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "hsl(var(--text-muted))" }}>
                  No agents yet.
                </td>
              </tr>
            )}
            {agents.map((a) => (
              <tr key={a.id}>
                <td style={{ color: "hsl(var(--text-primary))", fontWeight: 600 }}>{a.businessName}</td>
                <td>{a.fullName}</td>
                <td>{formatNgPhone(a.phone)}</td>
                <td>
                  <span className={`badge ${STATUS_META[a.approvalStatus]?.badge ?? "muted"}`}>
                    {STATUS_META[a.approvalStatus]?.label ?? a.approvalStatus.replace("_", " ")}
                  </span>
                </td>
                <td>{formatDate(a.createdAt)}</td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "inline-flex", gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => setSelected(a)}>
                      View
                    </button>
                    <button
                      className={a.approvalStatus === "active" ? "btn btn-coral" : "btn btn-emerald"}
                      disabled={pendingId === a.id}
                      onClick={() => toggleStatus(a)}
                    >
                      {pendingId === a.id ? "…" : a.approvalStatus === "active" ? "Suspend" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && <AgentDrawer agent={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function AgentDrawer({ agent, onClose }: { agent: AgentListItem; onClose: () => void }) {
  const [detail, setDetail] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getAgentDetailAction(agent.id)
      .then((d) => {
        if (alive) setDetail(d);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [agent.id]);

  return (
    <div style={overlay} onClick={onClose}>
      <div
        className="glass-card"
        style={{ width: 560, maxWidth: "100%", maxHeight: "88vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>{agent.businessName}</h2>
            <p style={{ color: "hsl(var(--text-muted))", margin: "4px 0" }}>
              {agent.fullName} · {formatNgPhone(agent.phone)}
            </p>
          </div>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        {loading && <p style={{ color: "hsl(var(--text-muted))" }}>Loading…</p>}

        {detail && (
          <>
            <h3 style={heading}>Cycles</h3>
            {detail.balances.length === 0 ? (
              <Empty>No cycles.</Empty>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Participant</th>
                    <th>Daily</th>
                    <th>Days paid</th>
                    <th style={{ textAlign: "right" }}>Deposited</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.balances.map((b) => (
                    <tr key={b.cycleId}>
                      <td style={{ color: "hsl(var(--text-primary))" }}>{b.participantName}</td>
                      <td>{formatNaira(b.dailyAmount)}</td>
                      <td>{b.daysPaid}</td>
                      <td style={{ textAlign: "right" }}>{formatNaira(b.totalDeposited)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <h3 style={heading}>Recent transactions</h3>
            {detail.recent.length === 0 ? (
              <Empty>No transactions.</Empty>
            ) : (
              <table className="data-table">
                <tbody>
                  {detail.recent.map((t) => (
                    <tr key={t.id}>
                      <td style={{ color: "hsl(var(--text-primary))" }}>{t.participantName}</td>
                      <td>
                        <span className={`badge ${t.kind === "deposit" ? "emerald" : "gold"}`}>{t.kind}</span>
                      </td>
                      <td>day {t.dayOfCycle}</td>
                      <td style={{ textAlign: "right" }}>{formatNaira(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ color: "hsl(var(--text-muted))", fontSize: 14, padding: "4px 0" }}>{children}</div>;
}

const heading: React.CSSProperties = {
  fontSize: 13,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "hsl(var(--text-muted))",
  margin: "20px 0 8px",
};

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(5,5,8,0.7)",
  backdropFilter: "blur(6px)",
  display: "grid",
  placeItems: "center",
  zIndex: 300,
  padding: 20,
};
