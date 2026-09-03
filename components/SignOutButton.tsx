"use client";

import { signOut } from "next-auth/react";
import { useConfirm } from "@/components/ConfirmProvider";

export default function SignOutButton({ style }: { style?: React.CSSProperties }) {
  const confirm = useConfirm();

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
    <button
      onClick={handleSignOut}
      style={{
        padding: "8px 14px",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "transparent",
        color: "inherit",
        cursor: "pointer",
        fontSize: 13,
        ...style,
      }}
    >
      Sign out
    </button>
  );
}
