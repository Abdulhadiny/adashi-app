"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoIcon } from "@/components/Logo";
import { signupAgentAction } from "./actions";

export default function SignupPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signupAgentAction({ phone, fullName, businessName });
    if (!res.ok) {
      setError(res.error ?? "Sign-up failed. Please try again.");
      setLoading(false);
      return;
    }
    router.push(`/verify?phone=${encodeURIComponent(phone)}`);
  }

  return (
    <form onSubmit={onSubmit} className="glass-card animate-fade-in" style={{ width: 400, maxWidth: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <LogoIcon size={36} />
        <span className="brand-wordmark" style={{ fontSize: 22, fontWeight: 800 }}>Adashi</span>
      </div>
      <h1 style={{ margin: "6px 0 4px", fontSize: 18 }}>Become an agent</h1>
      <p style={{ margin: "0 0 20px", color: "hsl(var(--text-secondary))", fontSize: 14 }}>
        Register your collection business. An admin will review and approve your account.
      </p>

      <label style={label}>Business name</label>
      <input
        className="input-field"
        placeholder="Okafor Savings Co."
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
        required
      />
      <label style={{ ...label, marginTop: 14 }}>Your full name</label>
      <input
        className="input-field"
        placeholder="Chidi Okafor"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />
      <label style={{ ...label, marginTop: 14 }}>Phone number</label>
      <input
        className="input-field"
        inputMode="tel"
        autoComplete="tel"
        placeholder="0803 000 0002"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
      />

      {error && <p style={errorText}>{error}</p>}
      <button className="btn-primary" style={{ marginTop: 18 }} disabled={loading}>
        {loading ? "Creating account…" : "Create account"}
      </button>
      <p style={{ marginTop: 14, fontSize: 13, color: "hsl(var(--text-muted))", textAlign: "center" }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "hsl(var(--brand-fg))" }}>
          Sign in
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
