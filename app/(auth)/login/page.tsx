"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoIcon } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
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

  return (
    <form onSubmit={onSubmit} className="glass-card animate-fade-in" style={{ width: 380, maxWidth: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <LogoIcon size={36} />
        <span style={{ fontSize: 22, fontWeight: 800, color: "#10B981" }}>Adashi</span>
      </div>
      <p style={{ margin: "0 0 20px", color: "hsl(var(--text-secondary))", fontSize: 14 }}>
        Enter your phone number to receive a one-time code.
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
      {error && <p style={errorText}>{error}</p>}
      <button className="btn-primary" style={{ marginTop: 18 }} disabled={loading || phone.trim().length < 6}>
        {loading ? "Sending…" : "Send code"}
      </button>
      <p style={{ marginTop: 14, fontSize: 13, color: "hsl(var(--text-muted))", textAlign: "center" }}>
        Are you a collection agent?{" "}
        <Link href="/signup" style={{ color: "hsl(var(--accent-emerald))" }}>
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
