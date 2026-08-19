"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

// The theme lives on <html data-theme> (set pre-paint by the inline script in the
// root layout). useSyncExternalStore reads it without a hydration mismatch — the
// server snapshot is "dark" and the client re-reads the real DOM value on mount.
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function getServerSnapshot(): Theme {
  return "dark";
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem("adashi-theme", next);
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.classList.toggle("light-theme", next === "light");
    listeners.forEach((l) => l());
  }

  return (
    <button
      onClick={toggle}
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      aria-label="Toggle theme"
      style={{
        background: "transparent",
        border: "none",
        color: "hsl(var(--text-primary))",
        cursor: "pointer",
        padding: 8,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
}
