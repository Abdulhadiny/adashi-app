"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  AlertTriangle,
  ChevronsLeft,
  ChevronsRight,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { LogoIcon } from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import { useConfirm } from "@/components/ConfirmProvider";
import type { MyNotification } from "@/lib/data/inapp";
import { formatNgPhone } from "@/lib/format";

const NAV = [
  { path: "/admin", label: "Overview", icon: LayoutDashboard },
  { path: "/admin/approvals", label: "Approvals", icon: UserCheck },
  { path: "/admin/agents", label: "Agents", icon: Users },
  { path: "/admin/ledger", label: "Ledger", icon: History },
  { path: "/admin/disputes", label: "Disputes", icon: AlertTriangle },
  { path: "/admin/audit", label: "Audit", icon: ScrollText },
];

const COLLAPSE_KEY = "adashi-admin-sidebar";

export default function AdminShell({
  phone,
  notifications,
  unread,
  children,
}: {
  phone?: string;
  notifications: MyNotification[];
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const confirm = useConfirm();
  const [menuOpen, setMenuOpen] = useState(false);
  // Start expanded so SSR + first client render agree; hydrate the saved
  // preference after mount to avoid a hydration mismatch.
  const [collapsed, setCollapsed] = useState(false);
  const current = NAV.find((n) => n.path === pathname)?.label ?? "Console";

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "collapsed");
    } catch {
      /* localStorage unavailable — keep default */
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "collapsed" : "expanded");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  async function handleSignOut() {
    const ok = await confirm({
      title: "Sign out?",
      message: "You'll need your PIN to sign back in.",
      confirmLabel: "Sign out",
      tone: "danger",
    });
    if (ok) signOut({ callbackUrl: "/login" });
  }

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
        .admin-aside { width: 280px; transition: width 0.22s ease; }
        .admin-aside.is-collapsed { width: 76px; }

        .admin-header-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 28px 24px; }
        .admin-aside.is-collapsed .admin-header-top { flex-direction: column; gap: 14px; padding: 22px 12px; }
        .admin-aside.is-collapsed .admin-brand { justify-content: center; }
        .admin-aside.is-collapsed .admin-brand-text { display: none; }

        .admin-nav-link { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 8px; }
        .admin-aside.is-collapsed .admin-nav-link { justify-content: center; gap: 0; padding: 12px 0; }
        .admin-aside.is-collapsed .admin-nav-label { display: none; }

        .admin-aside.is-collapsed .admin-phone { display: none; }
        .admin-signout { display: flex; align-items: center; justify-content: center; gap: 10px; }
        .admin-aside.is-collapsed .admin-signout-label { display: none; }

        .desktop-collapse-btn { display: flex; }
        .mobile-menu-btn { display: none; }
        .mobile-close-btn { display: none; }

        @media (max-width: 992px) {
          .admin-aside { position: fixed !important; left: ${menuOpen ? "0" : "-320px"} !important; top: 0; height: 100dvh; z-index: 250; box-shadow: 0 0 40px rgba(0,0,0,0.8); width: 280px !important; }
          .admin-aside.is-collapsed { width: 280px !important; }
          .admin-aside.is-collapsed .admin-header-top { flex-direction: row !important; padding: 28px 24px !important; }
          .admin-aside.is-collapsed .admin-brand-text { display: flex !important; }
          .admin-aside.is-collapsed .admin-nav-link { justify-content: flex-start !important; gap: 12px !important; padding: 12px 16px !important; }
          .admin-aside.is-collapsed .admin-nav-label { display: inline !important; }
          .admin-aside.is-collapsed .admin-phone { display: block !important; }
          .admin-aside.is-collapsed .admin-signout-label { display: inline !important; }
          .admin-overlay { display: ${menuOpen ? "block" : "none"} !important; }
          .mobile-menu-btn { display: flex !important; }
          .mobile-close-btn { display: block !important; }
          .desktop-collapse-btn { display: none !important; }
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
        className={`admin-aside${collapsed ? " is-collapsed" : ""}`}
        style={{
          backgroundColor: "hsl(var(--bg-card))",
          borderRight: "1px solid hsl(var(--border-glass))",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          flexShrink: 0,
        }}
      >
        <div
          className="admin-header-top"
          style={{ borderBottom: "1px solid hsl(var(--border-glass))" }}
        >
          <div className="admin-brand" style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <LogoIcon size={32} />
            <div className="admin-brand-text" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span className="brand-wordmark" style={{ fontSize: 18, fontWeight: 800 }}>
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
            className="desktop-collapse-btn"
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid hsl(var(--border-glass))",
              color: "hsl(var(--text-secondary))",
              padding: 6,
              borderRadius: 6,
              cursor: "pointer",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          </button>
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
                title={label}
                className="admin-nav-link"
                onClick={() => setMenuOpen(false)}
                style={{
                  color: active ? "hsl(var(--brand-fg))" : "hsl(var(--text-secondary))",
                  background: active ? "hsl(var(--brand-fg) / 0.1)" : "transparent",
                  fontSize: 15,
                  fontWeight: 600,
                  border: active ? "1px solid hsl(var(--brand-fg) / 0.2)" : "1px solid transparent",
                }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                <span className="admin-nav-label">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: 16, borderTop: "1px solid hsl(var(--border-glass))" }}>
          {phone && (
            <div className="admin-phone" style={{ fontSize: 12, color: "hsl(var(--text-muted))", padding: "0 4px 10px" }}>
              {formatNgPhone(phone)}
            </div>
          )}
          <button
            className="admin-signout"
            onClick={handleSignOut}
            title="Sign out"
            style={{
              width: "100%",
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
            <LogOut size={16} style={{ flexShrink: 0 }} />
            <span className="admin-signout-label">Sign Out</span>
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
            <NotificationBell items={notifications} unread={unread} />
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
