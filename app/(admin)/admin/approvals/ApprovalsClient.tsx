"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatDateTime, formatNgPhone } from "@/lib/format";
import type { PendingAgent } from "@/lib/data/approvals";
import { useConfirm } from "@/components/ConfirmProvider";
import { approveAgentAction, getAuditLogAction, rejectAgentAction } from "./actions";

type AuditRows = Awaited<ReturnType<typeof getAuditLogAction>>;

export default function ApprovalsClient({
  rows,
  total,
  page,
  pageSize,
  search,
}: {
  rows: PendingAgent[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [term, setTerm] = useState(search);
  const [rejecting, setRejecting] = useState<PendingAgent | null>(null);
  const [historyFor, setHistoryFor] = useState<PendingAgent | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const qs = new URLSearchParams();
    if (term.trim()) qs.set("search", term.trim());
    router.push(`/admin/approvals${qs.toString() ? `?${qs}` : ""}`);
  }

  function goPage(p: number) {
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (p > 1) qs.set("page", String(p));
    router.push(`/admin/approvals${qs.toString() ? `?${qs}` : ""}`);
  }

  async function approve(agent: PendingAgent) {
    const ok = await confirm({
      title: `Approve ${agent.businessName}?`,
      message: `${agent.fullName} will be granted agent access and can start collecting deposits.`,
      confirmLabel: "Approve",
    });
    if (!ok) return;
    setPendingId(agent.id);
    startTransition(async () => {
      try {
        await approveAgentAction(agent.id);
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="animate-fade-in">
      <h1 style={{ marginTop: 0, marginBottom: 20, fontSize: 24 }}>Approvals</h1>

      <form onSubmit={submitSearch} className="glass-card" style={{ marginBottom: 16, display: "flex", gap: 10 }}>
        <input
          className="input-field"
          placeholder="Search by name, business, or phone…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <button className="btn btn-emerald" type="submit">
          Search
        </button>
        {search && (
          <button type="button" className="btn btn-ghost" onClick={() => router.push("/admin/approvals")}>
            Clear
          </button>
        )}
      </form>

      <div className="glass-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Business</th>
              <th>Agent</th>
              <th>Phone</th>
              <th>Applied</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "hsl(var(--text-muted))" }}>
                  No pending agents.
                </td>
              </tr>
            )}
            {rows.map((a) => (
              <tr key={a.id}>
                <td style={{ color: "hsl(var(--text-primary))", fontWeight: 600 }}>{a.businessName}</td>
                <td>{a.fullName}</td>
                <td>{formatNgPhone(a.phone)}</td>
                <td>{formatDate(a.createdAt)}</td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "inline-flex", gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => setHistoryFor(a)}>
                      History
                    </button>
                    <button className="btn btn-coral" disabled={pendingId === a.id} onClick={() => setRejecting(a)}>
                      Reject
                    </button>
                    <button className="btn btn-emerald" disabled={pendingId === a.id} onClick={() => approve(a)}>
                      {pendingId === a.id ? "…" : "Approve"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
        <span style={{ fontSize: 13, color: "hsl(var(--text-muted))" }}>
          {total} pending · page {page} of {totalPages}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" disabled={page <= 1} onClick={() => goPage(page - 1)}>
            Previous
          </button>
          <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => goPage(page + 1)}>
            Next
          </button>
        </div>
      </div>

      {rejecting && <RejectModal agent={rejecting} onClose={() => setRejecting(null)} />}
      {historyFor && <HistoryModal agent={historyFor} onClose={() => setHistoryFor(null)} />}
    </div>
  );
}

function RejectModal({ agent, onClose }: { agent: PendingAgent; onClose: () => void }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await rejectAgentAction(agent.id, note);
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to reject.");
      }
    });
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div className="glass-card" style={{ width: 460, maxWidth: "100%" }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Reject {agent.businessName}</h2>
        <label style={{ fontSize: 13, color: "hsl(var(--text-muted))" }}>Reason (sent to the agent)</label>
        <textarea
          className="input-field"
          style={{ minHeight: 96, marginTop: 6, resize: "vertical" }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why is this application being rejected?"
        />
        {error && <p style={{ color: "hsl(var(--accent-coral))", fontSize: 13 }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button className="btn btn-coral" onClick={submit} disabled={pending || !note.trim()}>
            {pending ? "Rejecting…" : "Confirm reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryModal({ agent, onClose }: { agent: PendingAgent; onClose: () => void }) {
  const [audit, setAudit] = useState<AuditRows | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getAuditLogAction(agent.id)
      .then((a) => alive && setAudit(a))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [agent.id]);

  return (
    <div style={overlay} onClick={onClose}>
      <div className="glass-card" style={{ width: 460, maxWidth: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>History · {agent.businessName}</h2>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        {loading && <p style={{ color: "hsl(var(--text-muted))" }}>Loading…</p>}
        {audit && audit.length === 0 && (
          <p style={{ color: "hsl(var(--text-muted))" }}>No approval history yet.</p>
        )}
        {audit && audit.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {audit.map((a) => {
              const positive = a.action.includes("approved") || a.action.includes("activated");
              const negative = a.action.includes("rejected") || a.action.includes("suspended");
              const badge = positive ? "emerald" : negative ? "coral" : "muted";
              return (
                <div key={a.id} style={{ borderBottom: "1px solid hsl(var(--border-glass))", paddingBottom: 8 }}>
                  <span className={`badge ${badge}`}>{a.action.replace(/_/g, " ")}</span>
                  <span style={{ color: "hsl(var(--text-muted))", fontSize: 12, marginLeft: 8 }}>
                    {formatDateTime(a.createdAt)}
                    {a.actorName ? ` · ${a.actorName}` : ""}
                  </span>
                  <p style={{ color: "hsl(var(--text-secondary))", margin: "4px 0 0" }}>{a.summary}</p>
                  {a.note && (
                    <p style={{ color: "hsl(var(--text-muted))", margin: "2px 0 0", fontSize: 13 }}>{a.note}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
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
