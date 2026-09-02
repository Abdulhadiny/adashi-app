"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

export type ConfirmTone = "danger" | "default";

export type ConfirmOptions = {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Promise-based confirmation gate. Call `const confirm = useConfirm()` then
 * `if (await confirm({ ... })) doTheThing()`. Renders a single shared modal, so
 * every critical action funnels through one consistent dialog.
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}

export default function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setOptions(opts);
    });
  }, []);

  const settle = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  }, []);

  // Escape cancels; focus the confirm button when the dialog opens.
  useEffect(() => {
    if (!options) return;
    confirmBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") settle(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [options, settle]);

  const danger = options?.tone === "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <div
          style={overlay}
          onClick={() => settle(false)}
          role="dialog"
          aria-modal="true"
          aria-label={options.title}
        >
          <div
            className="glass-card"
            style={{ width: 400, maxWidth: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div
                aria-hidden
                style={{
                  flexShrink: 0,
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                  background: danger
                    ? "hsl(var(--accent-coral) / 0.12)"
                    : "hsl(var(--brand-fg) / 0.12)",
                  color: danger ? "hsl(var(--accent-coral))" : "hsl(var(--brand-fg))",
                }}
              >
                <AlertTriangle size={20} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>{options.title}</h2>
                {options.message && (
                  <p style={{ color: "hsl(var(--text-secondary))", fontSize: 14, margin: "6px 0 0" }}>
                    {options.message}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => settle(false)}>
                {options.cancelLabel ?? "Cancel"}
              </button>
              <button
                ref={confirmBtnRef}
                className={`btn ${danger ? "btn-coral" : "btn-emerald"}`}
                onClick={() => settle(true)}
              >
                {options.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(5,5,8,0.7)",
  backdropFilter: "blur(6px)",
  display: "grid",
  placeItems: "center",
  zIndex: 400,
  padding: 20,
};
