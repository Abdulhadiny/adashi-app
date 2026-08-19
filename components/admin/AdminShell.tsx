"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  AlertTriangle,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { LogoIcon } from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

const NAV = [
  { path: "/admin", label: "Overview", icon: LayoutDashboard },
  { path: "/admin/agents", label: "Agents Directory", icon: Users },
  { path: "/admin/approvals", label: "Approvals", icon: UserCheck },
  { path: "/admin/ledger", label: "Global Ledger", icon: History },
  { path: "/admin/disputes", label: "Disputes Control", icon: AlertTriangle },
  { path: "/admin/notifications", label: "Notification Logs", icon: MessageSquare },
];

export default function AdminShell({
  phone,
  children,
}: {
  phone?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const current = NAV.find((n) => n.path === pathname)?.label ?? "Console";

  return (
    <div
      style={{
        display: "flex",
        width: "100vw",
        height: "100dvh",
        backgroundColor: "hsl(var(--bg-dark))",
        color: "hsl(var(--text-primary))",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <style>{`
        @media (max-width: 992px) {
          .admin-aside { position: fixed !important; left: ${menuOpen ? "0" : "-300px"} !important; top: 0; height: 100dvh; z-index: 250; box-shadow: 0 0 40px rgba(0,0,0,0.8); }
          .admin-overlay { display: ${menuOpen ? "block" : "none"} !important; }
          .mobile-menu-btn { display: flex !important; }
          .mobile-close-btn { display: block !important; }
        }
      `}</style>

      <div
        className="admin-overlay"
        onClick={() => setMenuOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(5,5,8,0.75)",
          backdropFilter: "blur(8px)",
          zIndex: 200,
          display: "none",
        }}
      />

      <aside
        className="admin-aside"
        style={{
          width: 280,
          backgroundColor: "hsl(var(--bg-card))",
          borderRight: "1px solid hsl(var(--border-glass))",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: "28px 24px",
            borderBottom: "1px solid hsl(var(--border-glass))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LogoIcon size={32} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#10B981", letterSpacing: "-0.02em" }}>
                Adashi Digital
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "hsl(var(--text-muted))",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Admin Console
              </span>
            </div>
          </div>
          <button
            className="mobile-close-btn"
            onClick={() => setMenuOpen(false)}
            style={{ background: "transparent", border: "none", color: "hsl(var(--text-secondary))", cursor: "pointer", display: "none" }}
          >
            <X size={20} />
          </button>
        </div>

        <nav style={{ flex: 1, padding: "24px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {NAV.map(({ path, label, icon: Icon }) => {
            const active = pathname === path;
            return (
              <Link
                key={path}
                href={path}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 8,
                  color: active ? "#10B981" : "hsl(var(--text-secondary))",
                  background: active ? "rgba(16,185,129,0.08)" : "transparent",
                  fontSize: 15,
                  fontWeight: 600,
                  border: active ? "1px solid rgba(16,185,129,0.15)" : "1px solid transparent",
                }}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: 16, borderTop: "1px solid hsl(var(--border-glass))" }}>
          {phone && (
            <div style={{ fontSize: 12, color: "hsl(var(--text-muted))", padding: "0 4px 10px" }}>
              {phone}
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: 12,
              borderRadius: 8,
              backgroundColor: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.15)",
              color: "#EF4444",
              fontFamily: "inherit",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <header
          style={{
            height: 72,
            borderBottom: "1px solid hsl(var(--border-glass))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 32px",
            backgroundColor: "hsl(var(--bg-card))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="mobile-menu-btn"
              onClick={() => setMenuOpen(true)}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid hsl(var(--border-glass))",
                color: "hsl(var(--text-primary))",
                padding: 8,
                borderRadius: 6,
                cursor: "pointer",
                display: "none",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Menu size={20} />
            </button>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{current}</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle />
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "hsl(var(--text-secondary))",
                background: "rgba(255,255,255,0.05)",
                padding: "6px 12px",
                borderRadius: 6,
              }}
            >
              System Admin
            </span>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: "auto", backgroundColor: "hsl(var(--bg-dark))", padding: "28px 32px" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
