"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogoIcon } from "@/components/Logo";
import { needsPinAction } from "../set-pin/actions";

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const phone = params.get("phone") ?? "";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { phone, code, redirect: false });
    if (!res || res.error) {
      setError("That code is invalid or has expired.");
      setLoading(false);
      return;
    }
    // First-timers (and forgot-PIN visitors) go set their PIN; others go home.
    const needsPin = await needsPinAction().catch(() => false);
    router.push(needsPin ? "/set-pin" : "/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="glass-card animate-fade-in" style={{ width: 380, maxWidth: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <LogoIcon size={36} />
        <span style={{ fontSize: 22, fontWeight: 800, color: "#10B981" }}>Adashi</span>
      </div>
      <h1 style={{ margin: "6px 0 4px", fontSize: 18 }}>Enter your code</h1>
      <p style={{ margin: "0 0 20px", color: "hsl(var(--text-secondary))", fontSize: 14 }}>
        We sent a 6-digit code to {phone || "your phone"}.
      </p>
      <label style={label}>One-time code</label>
      <input
        className="input-field"
        style={{ letterSpacing: 8, fontSize: 20, textAlign: "center" }}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="••••••"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        required
      />
      {error && <p style={errorText}>{error}</p>}
      <button className="btn-primary" style={{ marginTop: 18 }} disabled={loading || code.length !== 6}>
        {loading ? "Verifying…" : "Verify & continue"}
      </button>
      <button
        type="button"
        onClick={() => router.push("/login")}
        className="btn btn-ghost"
        style={{ width: "100%", marginTop: 10 }}
      >
        Use a different number
      </button>
    </form>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div style={{ color: "hsl(var(--text-secondary))" }}>Loading…</div>}>
      <VerifyInner />
    </Suspense>
  );
}

const label: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  color: "hsl(var(--text-secondary))",
  marginBottom: 6,
};
const errorText: React.CSSProperties = { color: "hsl(var(--accent-coral))", fontSize: 13, marginTop: 10 };
