"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { formatNaira, formatNgPhone } from "@/lib/format";
import type { MyParticipant } from "@/lib/data/agent";
import {
  lookupParticipantAction,
  registerOrLinkParticipantAction,
  startCycleAction,
} from "../actions";

export default function ParticipantsClient({ participants }: { participants: MyParticipant[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [startFor, setStartFor] = useState<MyParticipant | null>(null);

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>Savers</h1>
        <button className="btn btn-emerald" onClick={() => setAddOpen(true)}>
          <UserPlus size={16} /> Link saver
        </button>
      </div>

      {participants.length === 0 && (
        <div className="glass-card" style={{ padding: 16, color: "hsl(var(--text-muted))", fontSize: 14 }}>
          No savers yet. Tap “Link saver” to register or link one by phone.
        </div>
      )}

      {participants.map((p) => (
        <div key={p.id} className="glass-card" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
            <div>
              <div style={{ color: "hsl(var(--text-primary))", fontWeight: 700 }}>{p.fullName}</div>
              <div style={{ color: "hsl(var(--text-muted))", fontSize: 13 }}>
                {formatNgPhone(p.phone)}
                {p.nickname ? ` · ${p.nickname}` : ""}
              </div>
            </div>
            {p.status === "pending" && <span className="badge gold">pending</span>}
          </div>

          {p.activeCycle ? (
            <a
              href={`/agent/cycles/${p.activeCycle.cycleId}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 10,
                background: "hsl(var(--accent-emerald) / 0.08)",
                border: "1px solid hsl(var(--accent-emerald) / 0.2)",
              }}
            >
              <span style={{ fontSize: 13, color: "hsl(var(--text-secondary))" }}>
                {formatNaira(p.activeCycle.dailyAmount)}/day · {p.activeCycle.daysPaid}/31 days
              </span>
              <strong style={{ color: "hsl(var(--accent-emerald))" }}>
                {formatNaira(p.activeCycle.totalDeposited)}
              </strong>
            </a>
          ) : (
            <button className="btn btn-ghost" style={{ marginTop: 12, width: "100%" }} onClick={() => setStartFor(p)}>
              Start a savings plan
            </button>
          )}
        </div>
      ))}

      {addOpen && <AddSaverModal onClose={() => setAddOpen(false)} />}
      {startFor && <StartPlanModal participant={startFor} onClose={() => setStartFor(null)} />}
    </div>
  );
}

type LookupResult = Awaited<ReturnType<typeof lookupParticipantAction>>;

function AddSaverModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [looked, setLooked] = useState(false);
  const [result, setResult] = useState<LookupResult>(null);
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function lookup() {
    setError(null);
    startTransition(async () => {
      const r = await lookupParticipantAction(phone);
      setResult(r);
      setLooked(true);
      if (r) {
        setFullName(r.fullName);
        setNickname(r.nickname ?? "");
      } else {
        setFullName("");
        setNickname("");
      }
    });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await registerOrLinkParticipantAction({ phone, fullName, nickname });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  const alreadyLinked = looked && result?.isAlreadyLinked === true;

  return (
    <div style={overlay} onClick={onClose}>
      <div className="glass-card" style={{ width: 400, maxWidth: "100%" }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Link a saver</h2>

        <label style={label}>Phone number</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input-field"
            inputMode="tel"
            placeholder="0803 000 0004"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setLooked(false);
              setResult(null);
            }}
          />
          <button className="btn btn-ghost" onClick={lookup} disabled={pending || phone.trim().length < 6}>
            {pending && !looked ? "…" : "Look up"}
          </button>
        </div>

        {looked && alreadyLinked && (
          <p style={{ ...note, color: "hsl(var(--accent-cobalt))" }}>
            {result?.fullName} is already linked to your ledger.
          </p>
        )}

        {looked && result && !alreadyLinked && (
          <>
            <p style={{ ...note, color: "hsl(var(--text-secondary))" }}>
              Found <strong>{result.fullName}</strong>. Link them to your ledger?
            </p>
          </>
        )}

        {looked && !result && (
          <>
            <p style={{ ...note, color: "hsl(var(--text-secondary))" }}>New saver — register them:</p>
            <label style={label}>Full name</label>
            <input className="input-field" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
            <label style={{ ...label, marginTop: 10 }}>Nickname (optional)</label>
            <input className="input-field" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Nickname" />
          </>
        )}

        {error && <p style={{ color: "hsl(var(--accent-coral))", fontSize: 13, marginTop: 10 }}>{error}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          {looked && !alreadyLinked && (
            <button
              className="btn btn-emerald"
              onClick={submit}
              disabled={pending || (!result && !fullName.trim())}
            >
              {pending ? "Saving…" : result ? "Link saver" : "Register saver"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const PRESETS = [50, 100, 200, 500, 1000];

function StartPlanModal({ participant, onClose }: { participant: MyParticipant; onClose: () => void }) {
  const router = useRouter();
  const [amount, setAmount] = useState(200);
  const [custom, setCustom] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const daily = useCustom ? Number(custom) : amount;
    startTransition(async () => {
      const res = await startCycleAction({ participantId: participant.id, dailyAmount: daily });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/agent/cycles/${res.cycleId}`);
    });
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div className="glass-card" style={{ width: 400, maxWidth: "100%" }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Start a plan</h2>
        <p style={{ color: "hsl(var(--text-secondary))", fontSize: 14 }}>
          Daily amount for <strong>{participant.fullName}</strong>. Day 1&apos;s contribution is the platform commission reserve.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {PRESETS.map((v) => (
            <button
              key={v}
              className={!useCustom && amount === v ? "btn btn-emerald" : "btn btn-ghost"}
              onClick={() => {
                setUseCustom(false);
                setAmount(v);
              }}
            >
              {formatNaira(v)}
            </button>
          ))}
          <button className={useCustom ? "btn btn-emerald" : "btn btn-ghost"} onClick={() => setUseCustom(true)}>
            Custom
          </button>
        </div>
        {useCustom && (
          <input
            className="input-field"
            style={{ marginTop: 10 }}
            inputMode="numeric"
            placeholder="Enter amount"
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/\D/g, ""))}
          />
        )}

        {error && <p style={{ color: "hsl(var(--accent-coral))", fontSize: 13, marginTop: 10 }}>{error}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button
            className="btn btn-emerald"
            onClick={submit}
            disabled={pending || (useCustom && !Number(custom))}
          >
            {pending ? "Starting…" : "Start plan"}
          </button>
        </div>
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
const note: React.CSSProperties = { fontSize: 14, marginTop: 12 };
