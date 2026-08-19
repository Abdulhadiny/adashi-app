"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton({ style }: { style?: React.CSSProperties }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
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
