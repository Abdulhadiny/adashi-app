"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings as SettingsIcon, ShieldAlert } from "lucide-react";
import { LogoIcon } from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

const NAV = [
  { href: "/participant", label: "Savings", icon: LayoutDashboard, exact: true },
  { href: "/participant/disputes", label: "Disputes", icon: ShieldAlert, exact: false },
  { href: "/participant/settings", label: "Settings", icon: SettingsIcon, exact: false },
];

export default function ParticipantShell({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div style={{ minHeight: "100dvh", background: "hsl(var(--bg-dark))", display: "flex", justifyContent: "center" }}>
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid hsl(var(--border-glass))",
          borderRight: "1px solid hsl(var(--border-glass))",
        }}
      >
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            borderBottom: "1px solid hsl(var(--border-glass))",
            background: "hsl(var(--bg-card))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LogoIcon size={26} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>{name ? `Hi, ${name.split(" ")[0]}` : "My Savings"}</span>
          </div>
          <ThemeToggle />
        </header>

        <main style={{ flex: 1, overflowY: "auto", padding: "16px 16px 88px" }}>{children}</main>

        <nav
          style={{
            position: "sticky",
            bottom: 0,
            zIndex: 10,
            display: "grid",
            gridTemplateColumns: `repeat(${NAV.length}, 1fr)`,
            borderTop: "1px solid hsl(var(--border-glass))",
            background: "hsl(var(--bg-card))",
          }}
        >
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  padding: "10px 0",
                  fontSize: 11,
                  fontWeight: 600,
                  color: active ? "#10B981" : "hsl(var(--text-muted))",
                }}
              >
                <Icon size={20} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
