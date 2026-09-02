"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime, formatNaira, formatNgPhone, ngPhoneSearchNeedle } from "@/lib/format";
import type { LedgerRow } from "@/lib/data/ledger";

interface AgentOption {
  id: string;
  fullName: string;
  businessName: string;
}

export default function LedgerClient({
  rows,
  agents,
  total,
  page,
  pageSize,
  filters,
}: {
  rows: LedgerRow[];
  agents: AgentOption[];
  total: number;
  page: number;
  pageSize: number;
  filters: { agentId: string; from: string; to: string };
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function applyFilters(next: Partial<{ agentId: string; from: string; to: string; page: number }>) {
    const merged = { ...filters, page: 1, ...next };
    const qs = new URLSearchParams();
    if (merged.agentId) qs.set("agentId", merged.agentId);
    if (merged.from) qs.set("from", merged.from);
    if (merged.to) qs.set("to", merged.to);
    if (merged.page && merged.page > 1) qs.set("page", String(merged.page));
    router.push(`/admin/ledger${qs.toString() ? `?${qs}` : ""}`);
  }

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    // Phones are stored E.164 (234…) but shown as 0803…; match on the E.164
    // needle so typing either form (or a bare fragment) finds the row.
    const phone = ngPhoneSearchNeedle(search);
    return rows.filter(
      (r) =>
        r.participantName?.toLowerCase().includes(term) ||
        (phone && r.participantPhone?.includes(phone)) ||
        r.agentName?.toLowerCase().includes(term) ||
        r.agentBusiness?.toLowerCase().includes(term),
    );
  }, [rows, search]);

  return (
    <div className="animate-fade-in">
      <h1 style={{ marginTop: 0, marginBottom: 20, fontSize: 24 }}>Global Ledger</h1>

      <div className="glass-card" style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
        <Field label="Agent">
          <select
            className="input-field"
            style={{ minWidth: 200 }}
            value={filters.agentId}
            onChange={(e) => applyFilters({ agentId: e.target.value })}
          >
            <option value="">All agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.businessName} ({a.fullName})
              </option>
            ))}
          </select>
        </Field>
        <Field label="From">
          <input type="date" className="input-field" value={filters.from} onChange={(e) => applyFilters({ from: e.target.value })} />
        </Field>
        <Field label="To">
          <input type="date" className="input-field" value={filters.to} onChange={(e) => applyFilters({ to: e.target.value })} />
        </Field>
        <Field label="Search (name / phone)">
          <input
            className="input-field"
            placeholder="Filter this page…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>
        {(filters.agentId || filters.from || filters.to) && (
          <button className="btn btn-ghost" onClick={() => router.push("/admin/ledger")}>
            Clear
          </button>
        )}
      </div>

      <div className="glass-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Participant</th>
              <th>Agent</th>
              <th>Kind</th>
              <th>Day</th>
              <th style={{ textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "hsl(var(--text-muted))" }}>
                  No transactions match.
                </td>
              </tr>
            )}
            {visible.map((r) => (
              <tr key={r.id}>
                <td>{formatDateTime(r.createdAt)}</td>
                <td style={{ color: "hsl(var(--text-primary))" }}>
                  {r.participantName}
                  <span style={{ color: "hsl(var(--text-muted))" }}> · {formatNgPhone(r.participantPhone)}</span>
                </td>
                <td>{r.agentBusiness ?? r.agentName}</td>
                <td>
                  <span className={`badge ${r.kind === "deposit" ? "emerald" : "gold"}`}>{r.kind}</span>
                </td>
                <td>{r.dayOfCycle}</td>
                <td style={{ textAlign: "right", color: "hsl(var(--text-primary))", fontWeight: 600 }}>
                  {formatNaira(r.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
        <span style={{ fontSize: 13, color: "hsl(var(--text-muted))" }}>
          {total} transaction{total === 1 ? "" : "s"} · page {page} of {totalPages}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" disabled={page <= 1} onClick={() => applyFilters({ page: page - 1 })}>
            Previous
          </button>
          <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => applyFilters({ page: page + 1 })}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>{label}</label>
      {children}
    </div>
  );
}
