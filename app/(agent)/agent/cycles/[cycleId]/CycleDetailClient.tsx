"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Download, Share2 } from "lucide-react";
import { formatDateTime, formatNaira, formatNgPhone } from "@/lib/format";
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
            <div style={{ color: "hsl(var(--text-muted))", fontSize: 13 }}>{formatNgPhone(cycle.participantPhone)}</div>
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [canShareFile, setCanShareFile] = useState(false);
  const fileName = `adashi-receipt-${receipt.transactionId.slice(0, 8)}.png`;

  // Pre-render the receipt image on mount. The PNG File is built here (not in the
  // Share click handler) so the async toBlob doesn't consume the user-activation
  // that navigator.share() requires on iOS.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = 640;
    const H = 470;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    drawReceipt(ctx, receipt, W, H);

    let objectUrl: string | null = null;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const f = new File([blob], fileName, { type: "image/png" });
      objectUrl = URL.createObjectURL(blob);
      setFile(f);
      setFileUrl(objectUrl);
      try {
        setCanShareFile(!!navigator.canShare && navigator.canShare({ files: [f] }));
      } catch {
        setCanShareFile(false);
      }
    }, "image/png");

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [receipt, fileName]);

  async function share() {
    if (!file) return;
    try {
      await navigator.share({
        files: [file],
        title: "Adashi receipt",
        text: `Payment receipt — ${formatNaira(receipt.amount)} for ${receipt.participantName} (day ${receipt.dayOfCycle}).`,
      });
    } catch {
      // user dismissed the share sheet, or sharing was cancelled — no-op.
    }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div className="glass-card" style={{ width: 360, maxWidth: "100%" }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0, fontSize: 18, textAlign: "center" }}>Receipt</h2>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "auto", borderRadius: 10, display: "block", border: "1px solid hsl(var(--border-glass))" }}
        />
        <p style={{ color: "hsl(var(--text-muted))", fontSize: 12, textAlign: "center", margin: "10px 0 0" }}>
          Share the receipt image with the saver on WhatsApp, or download it.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          {canShareFile && (
            <button className="btn btn-emerald" style={{ flex: 1 }} onClick={share} disabled={!file}>
              <Share2 size={16} /> Share
            </button>
          )}
          {fileUrl && (
            <a
              className="btn btn-ghost"
              href={fileUrl}
              download={fileName}
              style={{ flex: 1, textAlign: "center", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <Download size={16} /> Download
            </a>
          )}
        </div>
        <button className="btn btn-ghost" style={{ width: "100%", marginTop: 10 }} onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

// Draw the receipt onto a canvas (no external libs). White card so it reads well
// regardless of the app theme; a plain vector mark avoids tainting the canvas.
function drawReceipt(ctx: CanvasRenderingContext2D, r: DepositReceipt, W: number, H: number) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Header band
  ctx.fillStyle = "#047857";
  ctx.fillRect(0, 0, W, 84);

  // Vector mark + wordmark
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(42, 42, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#047857";
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("A", 42, 43);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("Adashi", 70, 40);
  ctx.font = "13px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText("Payment Receipt", 70, 60);
  ctx.textAlign = "right";
  ctx.font = "bold 14px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(r.businessName || r.agentName, W - 28, 46);
  ctx.textAlign = "left";

  // Amount
  let y = 132;
  ctx.fillStyle = "#64748b";
  ctx.font = "13px sans-serif";
  ctx.fillText("Amount paid", 28, y);
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 40px sans-serif";
  ctx.fillText(formatNaira(r.amount), 28, y + 42);

  // Divider
  y += 74;
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(28, y);
  ctx.lineTo(W - 28, y);
  ctx.stroke();

  // Detail rows
  const rows: [string, string][] = [
    ["Saver", r.participantName],
    ["Phone", formatNgPhone(r.participantPhone)],
    ["Day", `Day ${r.dayOfCycle} of 31`],
    ["Balance", formatNaira(r.balance)],
    ["Agent", r.agentName],
    ["Date", formatDateTime(r.recordedAt)],
    ["Reference", r.transactionId.slice(0, 8).toUpperCase()],
  ];
  y += 30;
  for (const [label, value] of rows) {
    ctx.fillStyle = "#64748b";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(label, 28, y);
    ctx.fillStyle = "#0f172a";
    ctx.font = "600 14px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(value, W - 28, y);
    y += 30;
  }

  // Footer
  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Thank you for saving with Adashi", W / 2, H - 18);
  ctx.textAlign = "left";
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
