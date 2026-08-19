"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { formatDate, formatNaira } from "@/lib/format";
import type { getMyPlanDetail } from "@/lib/data/participant";
import { raiseDisputeAction } from "../../actions";

type PlanDetail = NonNullable<Awaited<ReturnType<typeof getMyPlanDetail>>>;

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export default function PlanDetailClient({ detail }: { detail: PlanDetail }) {
  const router = useRouter();
  const { cycle, deposits, totalDeposited, daysPaid } = detail;
  const paidDays = new Set(deposits.map((d) => d.dayOfCycle));
  const [disputing, setDisputing] = useState(false);
  const closed = cycle.status === "closed";

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <button className="btn btn-ghost" style={{ alignSelf: "start" }} onClick={() => router.push("/participant")}>
        <ArrowLeft size={16} /> Savings
      </button>

      <div className="glass-card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{cycle.agentBusiness ?? cycle.agentName}</div>
            <div style={{ color: "hsl(var(--text-muted))", fontSize: 13 }}>
              {formatDate(cycle.startDate)}
              {cycle.endDate ? ` → ${formatDate(cycle.endDate)}` : ""}
            </div>
          </div>
          <span className={`badge ${closed ? "muted" : "emerald"}`}>{cycle.status}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          <Stat label={closed ? "Payout" : "Saved"} value={formatNaira(closed ? cycle.payoutAmount : totalDeposited)} accent />
          <Stat label="Daily" value={formatNaira(cycle.dailyAmount)} />
          <Stat label="Days paid" value={`${daysPaid} / 31`} />
          {closed && <Stat label="Fee" value={formatNaira(cycle.commission)} />}
        </div>
      </div>

      <div className="glass-card" style={{ padding: 16 }}>
        <div className="kpi-title" style={{ marginBottom: 12 }}>
          Your contribution card
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
          {DAYS.map((day) => {
            const paid = paidDays.has(day);
            return (
              <div
                key={day}
                title={`Day ${day}`}
                style={{
                  aspectRatio: "1",
                  borderRadius: 8,
                  border: paid ? "1px solid hsl(var(--accent-emerald) / 0.4)" : "1px solid hsl(var(--border-glass))",
                  background: paid ? "hsl(var(--accent-emerald) / 0.15)" : "rgba(255,255,255,0.03)",
                  color: paid ? "hsl(var(--accent-emerald))" : "hsl(var(--text-muted))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {paid ? <Check size={16} /> : day}
              </div>
            );
          })}
        </div>
      </div>

      <button
        className="btn btn-coral"
        style={{ padding: 14 }}
        disabled={deposits.length === 0}
        onClick={() => setDisputing(true)}
      >
        Report an issue with a deposit
      </button>
      {deposits.length === 0 && (
        <p style={{ color: "hsl(var(--text-muted))", fontSize: 12, textAlign: "center", marginTop: -6 }}>
          No deposits recorded yet.
        </p>
      )}

      {disputing && <DisputeModal deposits={deposits} onClose={() => setDisputing(false)} />}
    </div>
  );
}

function DisputeModal({
  deposits,
  onClose,
}: {
  deposits: PlanDetail["deposits"];
  onClose: () => void;
}) {
  const router = useRouter();
  const [transactionId, setTransactionId] = useState(deposits[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await raiseDisputeAction({ transactionId, reason });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
      router.push("/participant/disputes");
      router.refresh();
    });
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div className="glass-card" style={{ width: 400, maxWidth: "100%" }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Report an issue</h2>
        <label style={label}>Which deposit?</label>
        <select className="input-field" value={transactionId} onChange={(e) => setTransactionId(e.target.value)}>
          {deposits.map((d) => (
            <option key={d.id} value={d.id}>
              Day {d.dayOfCycle} · {formatNaira(d.amount)} · {formatDate(d.createdAt)}
            </option>
          ))}
        </select>
        <label style={{ ...label, marginTop: 12 }}>What&apos;s wrong?</label>
        <textarea
          className="input-field"
          style={{ minHeight: 90, resize: "vertical" }}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe the issue (e.g. I paid but it wasn't recorded)…"
        />
        {error && <p style={{ color: "hsl(var(--accent-coral))", fontSize: 13, marginTop: 8 }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button className="btn btn-coral" onClick={submit} disabled={pending || !reason.trim() || !transactionId}>
            {pending ? "Submitting…" : "Submit dispute"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: accent ? "hsl(var(--accent-emerald))" : "hsl(var(--text-primary))" }}>
        {value}
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
const label: React.CSSProperties = { display: "block", fontSize: 13, color: "hsl(var(--text-muted))", marginBottom: 6 };
