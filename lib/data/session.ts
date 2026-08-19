// The RBAC boundary. Every lib/data function resolves the caller from the session
// itself (callers never pass their own id/role) and scopes queries accordingly.
// This replaces every Supabase RLS policy.
import { auth } from "@/lib/auth/auth";
import type { UserRole } from "@/lib/db/schema";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export interface SessionCtx {
  userId: string;
  role: UserRole;
  phone?: string;
}

/** Reads the caller from the JWT cookie (no DB hit). Throws if unauthenticated. */
export async function getSessionOrThrow(): Promise<SessionCtx> {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    throw new UnauthorizedError();
  }
  return {
    userId: session.user.id,
    role: session.user.role,
    phone: session.user.phone,
  };
}

/** Throws ForbiddenError unless the caller holds one of the given roles. */
export async function requireRole(...roles: UserRole[]): Promise<SessionCtx> {
  const ctx = await getSessionOrThrow();
  if (!roles.includes(ctx.role)) {
    throw new ForbiddenError();
  }
  return ctx;
}
