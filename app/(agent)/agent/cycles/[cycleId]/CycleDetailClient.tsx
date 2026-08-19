"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { formatNaira } from "@/lib/format";
import type { getCycleDetail } from "@/lib/data/agent";
import { closeCycleAction, markDepositAction, type DepositReceipt } from "../../actions";

type CycleDetail = NonNullable<Awaited<ReturnType<typeof getCycleDetail>>>;

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export default function CycleDetailClient({ detail }: { detail: CycleDetail }) {
  const router = useRouter();
  const { cycle, deposits, totalDeposited, daysPaid } = detail;
  const paidDays = new Set(deposits.map((d) => d.dayOfCycle));
  const daily = Number(cycle.dailyAmount);
  const isActive = cycle.status === "active";

  const [confirmDay, setConfirmDay] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<DepositReceipt | null>(null);
  const [closing, setClosing] = useState(false);

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <button className="btn btn-ghost" style={{ alignSelf: "start" }} onClick={() => router.push("/agent/participants")}>
        <ArrowLeft size={16} /> Savers
      </button>

      <div className="glass-card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{cycle.participantName}</div>
            <div style={{ color: "hsl(var(--text-muted))", fontSize: 13 }}>{cycle.participantPhone}</div>
          </div>
          <span className={`badge ${isActive ? "emerald" : "muted"}`}>{cycle.status}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          <Stat label="Collected" value={formatNaira(totalDeposited)} />
          <Stat label="Payout reserve" value={formatNaira(Math.max(0, Number(totalDeposited) - daily))} />
          <Stat label="Daily" value={formatNaira(cycle.dailyAmount)} />
          <Stat label="Days paid" value={`${daysPaid} / 31`} />
        </div>
      </div>

      {!isActive && (
        <div className="glass-card" style={{ padding: 16 }}>
          <div className="kpi-title" style={{ marginBottom: 8 }}>
            Closed
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Stat label="Commission" value={formatNaira(cycle.commission)} />
            <Stat label="Payout" value={formatNaira(cycle.payoutAmount)} />
          </div>
        </div>
      )}

      <div className="glass-card" style={{ padding: 16 }}>
        <div className="kpi-title" style={{ marginBottom: 12 }}>
          Contribution card
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
          {DAYS.map((day) => {
            const paid = paidDays.has(day);
            return (
              <button
                key={day}
                disabled={paid || !isActive}
                onClick={() => setConfirmDay(day)}
                title={`Day ${day}`}
                style={{
                  aspectRatio: "1",
                  borderRadius: 8,
                  border: paid ? "1px solid hsl(var(--accent-emerald) / 0.4)" : "1px solid hsl(var(--border-glass))",
                  background: paid ? "hsl(var(--accent-emerald) / 0.15)" : "rgba(255,255,255,0.03)",
                  color: paid ? "hsl(var(--accent-emerald))" : "hsl(var(--text-secondary))",
                  cursor: paid || !isActive ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {paid ? <Check size={16} /> : day}
              </button>
            );
          })}
        </div>
      </div>

      {isActive && (
        <button className="btn btn-coral" style={{ padding: 14 }} onClick={() => setClosing(true)}>
          Close plan &amp; deduct commission
        </button>
      )}

      {confirmDay !== null && (
        <DepositModal
          cycleId={cycle.id}
          day={confirmDay}
          amount={cycle.dailyAmount}
          onClose={() => setConfirmDay(null)}
          onDone={(r) => {
            setConfirmDay(null);
            setReceipt(r);
            router.refresh();
          }}
        />
      )}
      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
      {closing && (
        <CloseModal
          cycleId={cycle.id}
          daily={daily}
          daysPaid={daysPaid}
          totalDeposited={Number(totalDeposited)}
          onClose={() => setClosing(false)}
          onDone={() => {
            setClosing(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function DepositModal({
  cycleId,
  day,
  amount,
  onClose,
  onDone,
}: {
  cycleId: string;
  day: number;
  amount: string;
  onClose: () => void;
  onDone: (r: DepositReceipt) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await markDepositAction({ cycleId, dayOfCycle: day });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onDone(res.receipt);
    });
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div className="glass-card" style={{ width: 360, maxWidth: "100%", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Record deposit</h2>
        <p style={{ color: "hsl(var(--text-secondary))" }}>
          Day {day} · <strong style={{ color: "hsl(var(--text-primary))" }}>{formatNaira(amount)}</strong>
        </p>
        {error && <p style={{ color: "hsl(var(--accent-coral))", fontSize: 13 }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button className="btn btn-emerald" style={{ flex: 1 }} onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReceiptModal({ receipt, onClose }: { receipt: DepositReceipt; onClose: () => void }) {
  return (
    <div style={overlay} onClick={onClose}>
      <div className="glass-card" style={{ width: 340, maxWidth: "100%" }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0, fontSize: 18, textAlign: "center" }}>Receipt</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
          <Line label="Saver" value={receipt.participantName} />
          <Line label="Amount" value={formatNaira(receipt.amount)} />
          <Line label="Day" value={String(receipt.dayOfCycle)} />
          <Line label="Balance" value={formatNaira(receipt.balance)} />
          <Line label="Agent" value={receipt.agentName} />
          <Line label="Ref" value={receipt.transactionId.slice(0, 8).toUpperCase()} />
        </div>
        <button className="btn btn-emerald" style={{ width: "100%", marginTop: 16 }} onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

function CloseModal({
  cycleId,
  daily,
  daysPaid,
  totalDeposited,
  onClose,
  onDone,
}: {
  cycleId: string;
  daily: number;
  daysPaid: number;
  totalDeposited: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const isEarly = daysPaid < 15;
  const [manual, setManual] = useState(String(daily));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const chosen = isEarly ? Number(manual) : daily;
  const commission = Math.min(Number.isFinite(chosen) ? chosen : 0, totalDeposited);
  const payout = Math.max(0, totalDeposited - commission);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await closeCycleAction({ cycleId, manualCommission: isEarly ? Number(manual) : undefined });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onDone();
    });
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div className="glass-card" style={{ width: 380, maxWidth: "100%" }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Close plan</h2>
        <p style={{ color: "hsl(var(--text-secondary))", fontSize: 14 }}>
          {daysPaid} day{daysPaid === 1 ? "" : "s"} collected · {formatNaira(totalDeposited)} total.
        </p>
        {isEarly && (
          <>
            <p style={{ color: "hsl(var(--accent-gold))", fontSize: 13 }}>
              Early close (under 15 days) — enter the negotiated commission.
            </p>
            <input
              className="input-field"
              inputMode="numeric"
              value={manual}
              onChange={(e) => setManual(e.target.value.replace(/\D/g, ""))}
            />
          </>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <Stat label="Commission" value={formatNaira(commission)} />
          <Stat label="Payout" value={formatNaira(payout)} />
        </div>
        {error && <p style={{ color: "hsl(var(--accent-coral))", fontSize: 13, marginTop: 8 }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button className="btn btn-coral" onClick={submit} disabled={pending}>
            {pending ? "Closing…" : "Close plan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "hsl(var(--text-primary))" }}>{value}</div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "hsl(var(--text-muted))" }}>{label}</span>
      <span style={{ color: "hsl(var(--text-primary))", fontWeight: 600 }}>{value}</span>
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
