export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "hsl(var(--bg-dark))",
        color: "hsl(var(--text-primary))",
      }}
    >
      {children}
    </div>
  );
}
