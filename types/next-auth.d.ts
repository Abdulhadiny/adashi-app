import type { UserRole } from "@/lib/db/schema";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      phone?: string;
    } & DefaultSession["user"];
  }

  // Shape returned by Credentials.authorize()
  interface User {
    role: UserRole;
    phone?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: UserRole;
    phone?: string;
  }
}
