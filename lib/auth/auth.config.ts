// EDGE-SAFE Auth.js config. Imported by middleware.ts and auth.ts.
// MUST NOT import the DB, crypto, or any Node-only module — anything reachable
// from here is bundled into the edge middleware. Providers (Credentials +
// authorize, which touch the DB) are added only in auth.ts.
import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/lib/db/schema"; // type-only import — erased at build

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    // `user` is only present on initial sign-in (from Credentials.authorize).
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = (user as { role?: UserRole }).role;
        token.phone = (user as { phone?: string }).phone;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId ?? "") as string;
        session.user.role = token.role as UserRole;
        session.user.phone = token.phone as string | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
