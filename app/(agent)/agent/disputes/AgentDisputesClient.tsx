"use client";

import { useState, useTransition } from "react";
import { formatDateTime, formatNaira } from "@/lib/format";
import type { AgentDisputeRow } from "@/lib/data/agent";
import { resolveDisputeAgentAction } from "../actions";

export default function AgentDisputesClient({ disputes }: { disputes: AgentDisputeRow[] }) {
  const open = disputes.filter((d) => d.status === "open");
  const resolved = disputes.filter((d) => d.status === "resolved");
  const [active, setActive] = useState<AgentDisputeRow | null>(null);

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h1 style={{ fontSize: 20, margin: 0 }}>Disputes</h1>

      <Section title={`Open (${open.length})`}>
        {open.length === 0 ? (
          <Empty>No open disputes.</Empty>
        ) : (
          open.map((d) => (
            <div key={d.id} className="glass-card" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <strong style={{ color: "hsl(var(--text-primary))" }}>{d.participantName}</strong>
                <span className="badge coral">open</span>
              </div>
              <p style={{ color: "hsl(var(--text-secondary))", margin: "4px 0", fontSize: 14 }}>{d.reason}</p>
              <div style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>
                {formatNaira(d.txAmount)} ({d.txKind}, day {d.txDay}) · {formatDateTime(d.createdAt)}
              </div>
              <button className="btn btn-emerald" style={{ width: "100%", marginTop: 12 }} onClick={() => setActive(d)}>
                Resolve
              </button>
            </div>
          ))
        )}
      </Section>

      <Section title={`Resolved (${resolved.length})`}>
        {resolved.length === 0 ? (
          <Empty>No resolved disputes.</Empty>
        ) : (
          resolved.map((d) => (
            <div key={d.id} className="glass-card" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <strong style={{ color: "hsl(var(--text-primary))" }}>{d.participantName}</strong>
                <span className="badge emerald">resolved</span>
              </div>
              <p style={{ color: "hsl(var(--text-secondary))", margin: "4px 0", fontSize: 14 }}>{d.reason}</p>
              {d.resolutionNote && (
                <p style={{ color: "hsl(var(--text-muted))", fontSize: 13, margin: 0 }}>{d.resolutionNote}</p>
              )}
            </div>
          ))
        )}
      </Section>

      {active && <ResolveModal dispute={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function ResolveModal({ dispute, onClose }: { dispute: AgentDisputeRow; onClose: () => void }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(accepted: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await resolveDisputeAgentAction({ id: dispute.id, accepted, note });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
    });
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div className="glass-card" style={{ width: 400, maxWidth: "100%" }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Resolve dispute</h2>
        <p style={{ color: "hsl(var(--text-secondary))", fontSize: 14 }}>
          {dispute.participantName}: “{dispute.reason}”
        </p>
        <label style={{ fontSize: 13, color: "hsl(var(--text-muted))" }}>Resolution note</label>
        <textarea
          className="input-field"
          style={{ minHeight: 90, marginTop: 6, resize: "vertical" }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Explain the outcome…"
        />
        {error && <p style={{ color: "hsl(var(--accent-coral))", fontSize: 13 }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="btn btn-coral" style={{ flex: 1 }} disabled={pending || !note.trim()} onClick={() => submit(false)}>
            Reject (invalid)
          </button>
          <button className="btn btn-emerald" style={{ flex: 1 }} disabled={pending || !note.trim()} onClick={() => submit(true)}>
            Accept (valid)
          </button>
        </div>
        <button className="btn btn-ghost" style={{ width: "100%", marginTop: 8 }} onClick={onClose} disabled={pending}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ fontSize: 14, color: "hsl(var(--text-secondary))", marginBottom: 10 }}>{title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ color: "hsl(var(--text-muted))", fontSize: 14 }}>{children}</div>;
}

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
