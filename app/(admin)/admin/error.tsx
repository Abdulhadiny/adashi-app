"use client";

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
      <div className="glass-card" style={{ textAlign: "center", maxWidth: 420 }}>
        <h2 style={{ marginTop: 0, fontSize: 20 }}>Something went wrong</h2>
        <p style={{ color: "hsl(var(--text-secondary))", fontSize: 14 }}>
          {error.message || "An unexpected error occurred while loading this page."}
        </p>
        <button className="btn btn-emerald" style={{ marginTop: 12 }} onClick={() => reset()}>
          Try again
        </button>
      </div>
    </div>
  );
}
