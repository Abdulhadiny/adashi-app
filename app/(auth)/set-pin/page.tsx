"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogoIcon } from "@/components/Logo";
import { setPinAction } from "./actions";

// Reached after an OTP-verified login (proxy redirects unauthenticated visitors
// to /login). Doubles as the change-PIN and forgot-PIN target.
export default function SetPinPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin !== confirm) {
      setError("The PINs do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await setPinAction(pin);
    if (!res.ok) {
      setError(res.error ?? "Could not save your PIN. Please try again.");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="glass-card animate-fade-in" style={{ width: 380, maxWidth: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <LogoIcon size={36} />
        <span className="brand-wordmark" style={{ fontSize: 22, fontWeight: 800 }}>Adashi</span>
      </div>
      <h1 style={{ margin: "6px 0 4px", fontSize: 18 }}>Create your PIN</h1>
      <p style={{ margin: "0 0 20px", color: "hsl(var(--text-secondary))", fontSize: 14 }}>
        Choose a 6-digit PIN. Next time, sign in with your phone number and PIN — no code needed.
      </p>

      <label style={label}>New 6-digit PIN</label>
      <input
        className="input-field"
        style={pinInput}
        type="password"
        inputMode="numeric"
        autoComplete="new-password"
        placeholder="••••••"
        maxLength={6}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        required
      />
      <label style={{ ...label, marginTop: 14 }}>Confirm PIN</label>
      <input
        className="input-field"
        style={pinInput}
        type="password"
        inputMode="numeric"
        autoComplete="new-password"
        placeholder="••••••"
        maxLength={6}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
        required
      />

      {error && <p style={errorText}>{error}</p>}
      <button className="btn-primary" style={{ marginTop: 18 }} disabled={loading || pin.length !== 6 || confirm.length !== 6}>
        {loading ? "Saving…" : "Save PIN & continue"}
      </button>
      <button
        type="button"
        onClick={() => {
          router.push("/");
          router.refresh();
        }}
        className="btn btn-ghost"
        style={{ width: "100%", marginTop: 10 }}
      >
        Skip for now
      </button>
    </form>
  );
}

const label: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  color: "hsl(var(--text-secondary))",
  marginBottom: 6,
};
const pinInput: React.CSSProperties = { letterSpacing: 8, fontSize: 20, textAlign: "center" };
const errorText: React.CSSProperties = { color: "hsl(var(--accent-coral))", fontSize: 13, marginTop: 10 };
