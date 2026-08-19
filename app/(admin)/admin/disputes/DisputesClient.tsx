"use client";

import { useState, useTransition } from "react";
import { formatDateTime, formatNaira } from "@/lib/format";
import type { DisputeRow } from "@/lib/data/disputes";
import { resolveDisputeAction } from "./actions";

export default function DisputesClient({ disputes }: { disputes: DisputeRow[] }) {
  const open = disputes.filter((d) => d.status === "open");
  const resolved = disputes.filter((d) => d.status === "resolved");
  const [active, setActive] = useState<DisputeRow | null>(null);

  return (
    <div className="animate-fade-in">
      <h1 style={{ marginTop: 0, marginBottom: 20, fontSize: 24 }}>Disputes Control</h1>

      <Section title={`Open (${open.length})`}>
        {open.length === 0 ? (
          <Empty>No open disputes.</Empty>
        ) : (
          open.map((d) => (
            <div key={d.id} className="glass-card" style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <span className="badge coral">open</span>
                  <strong style={{ color: "hsl(var(--text-primary))" }}>{d.participantName}</strong>
                  <span style={{ color: "hsl(var(--text-muted))", fontSize: 13 }}>· {d.participantPhone}</span>
                </div>
                <p style={{ color: "hsl(var(--text-secondary))", margin: "4px 0" }}>{d.reason}</p>
                <div style={{ fontSize: 13, color: "hsl(var(--text-muted))" }}>
                  Agent: {d.agentName} · Txn: {formatNaira(d.txAmount)} ({d.txKind}, day {d.txDay}) · {formatDateTime(d.createdAt)}
                </div>
              </div>
              <button className="btn btn-emerald" style={{ alignSelf: "center" }} onClick={() => setActive(d)}>
                Resolve
              </button>
            </div>
          ))
        )}
      </Section>

      <Section title={`Resolved (${resolved.length})`}>
        {resolved.length === 0 ? (
          <Empty>No resolved disputes yet.</Empty>
        ) : (
          resolved.map((d) => (
            <div key={d.id} className="glass-card">
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <span className="badge emerald">resolved</span>
                <strong style={{ color: "hsl(var(--text-primary))" }}>{d.participantName}</strong>
              </div>
              <p style={{ color: "hsl(var(--text-secondary))", margin: "4px 0" }}>{d.reason}</p>
              {d.resolutionNote && (
                <p style={{ color: "hsl(var(--text-muted))", fontSize: 13, margin: "4px 0" }}>
                  Resolution: {d.resolutionNote} · {formatDateTime(d.resolvedAt)}
                </p>
              )}
            </div>
          ))
        )}
      </Section>

      {active && <ResolveModal dispute={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function ResolveModal({ dispute, onClose }: { dispute: DisputeRow; onClose: () => void }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await resolveDisputeAction(dispute.id, note);
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to resolve.");
      }
    });
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div className="glass-card" style={{ width: 460, maxWidth: "100%" }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Resolve dispute</h2>
        <p style={{ color: "hsl(var(--text-secondary))", fontSize: 14 }}>
          {dispute.participantName}: “{dispute.reason}”
        </p>
        <label style={{ fontSize: 13, color: "hsl(var(--text-muted))" }}>Resolution note</label>
        <textarea
          className="input-field"
          style={{ minHeight: 96, marginTop: 6, resize: "vertical" }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Describe how this was resolved…"
        />
        {error && <p style={{ color: "hsl(var(--accent-coral))", fontSize: 13 }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button className="btn btn-emerald" onClick={submit} disabled={pending || !note.trim()}>
            {pending ? "Resolving…" : "Mark resolved"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 15, color: "hsl(var(--text-secondary))", marginBottom: 12 }}>{title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
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
