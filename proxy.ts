// Edge role gate (Next 16 "proxy" convention — formerly middleware.ts).
// Imports auth.config ONLY (no DB/crypto), so nothing Node-only enters the edge
// bundle. This is a coarse UX redirect; the real security boundary is lib/data
// (server-side, per-query scoping).
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/lib/auth/auth.config";

const { auth } = NextAuth(authConfig);

const ROLE_HOME = {
  admin: "/admin",
  agent: "/agent",
  participant: "/participant",
} as const;

export default auth((req) => {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const role = req.auth?.user?.role;

  // Unauthenticated → login
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // Role-gate by path prefix (route-group parens don't appear in the URL)
  const need =
    path.startsWith("/admin")
      ? "admin"
      : path.startsWith("/agent")
        ? "agent"
        : path.startsWith("/participant")
          ? "participant"
          : null;

  if (need && role !== need) {
    return NextResponse.redirect(new URL(role ? ROLE_HOME[role] : "/login", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Run on everything except static assets, auth/api routes, and the public auth pages.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|verify|signup).*)"],
};
