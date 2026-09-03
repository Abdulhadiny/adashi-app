"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogoIcon } from "@/components/Logo";

// PIN sign-in is the default (no SMS cost). The OTP path remains for first-time
// logins (onboarding confirmation) and forgot-PIN recovery.
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"pin" | "otp">("pin");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPinSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { phone, pin, redirect: false });
    if (!res || res.error) {
      setError(
        res?.code === "pin_locked"
          ? "Too many wrong attempts — try again in 15 minutes, or sign in with a one-time code."
          : "Incorrect phone number or PIN. New here or forgot your PIN? Use a one-time code below.",
      );
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function onOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) throw new Error("send failed");
      router.push(`/verify?phone=${encodeURIComponent(phone)}`);
    } catch {
      setError("Could not send the code. Please try again.");
      setLoading(false);
    }
  }

  function switchMode(next: "pin" | "otp") {
    setMode(next);
    setError(null);
    setPin("");
  }

  return (
    <form
      onSubmit={mode === "pin" ? onPinSubmit : onOtpSubmit}
      className="glass-card animate-fade-in"
      style={{ width: 380, maxWidth: "100%" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <LogoIcon size={36} />
        <span className="brand-wordmark" style={{ fontSize: 22, fontWeight: 800 }}>Adashi</span>
      </div>
      <p style={{ margin: "0 0 20px", color: "hsl(var(--text-secondary))", fontSize: 14 }}>
        {mode === "pin"
          ? "Sign in with your phone number and PIN."
          : "Enter your phone number to receive a one-time code."}
      </p>

      <label style={label}>Phone number</label>
      <input
        className="input-field"
        inputMode="tel"
        autoComplete="tel"
        placeholder="0803 000 0001"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
      />

      {mode === "pin" && (
        <>
          <label style={{ ...label, marginTop: 14 }}>6-digit PIN</label>
          <input
            className="input-field"
            style={{ letterSpacing: 8, fontSize: 20, textAlign: "center" }}
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            placeholder="••••••"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            required
          />
        </>
      )}

      {error && <p style={errorText}>{error}</p>}

      <button
        className="btn-primary"
        style={{ marginTop: 18 }}
        disabled={loading || phone.trim().length < 6 || (mode === "pin" && pin.length !== 6)}
      >
        {loading ? (mode === "pin" ? "Signing in…" : "Sending…") : mode === "pin" ? "Sign in" : "Send code"}
      </button>

      <button
        type="button"
        onClick={() => switchMode(mode === "pin" ? "otp" : "pin")}
        className="btn btn-ghost"
        style={{ width: "100%", marginTop: 10 }}
      >
        {mode === "pin" ? "First time or forgot PIN? Use a one-time code" : "Have a PIN? Sign in with it"}
      </button>

      <p style={{ marginTop: 14, fontSize: 13, color: "hsl(var(--text-muted))", textAlign: "center" }}>
        Are you a collection agent?{" "}
        <Link href="/signup" style={{ color: "hsl(var(--brand-fg))" }}>
          Create an account
        </Link>
      </p>
    </form>
  );
}

const label: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  color: "hsl(var(--text-secondary))",
  marginBottom: 6,
};
const errorText: React.CSSProperties = { color: "hsl(var(--accent-coral))", fontSize: 13, marginTop: 10 };
