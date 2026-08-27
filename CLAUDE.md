# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Adashi is a digital community-savings / microfinance platform (rotating daily-savings groups — _adashe /
esusu / ajo_) for Nigeria/West Africa. Field **agents** collect small daily contributions from **savers
(participants)** over a cycle, take a commission at close, and pay out the balance; **admins** oversee
agents, the money ledger, disputes, and notifications.

The repo root is **one Next.js 16 (App Router) app** for all three roles ("three interfaces, one auth"),
on plain **Postgres + Drizzle + Auth.js (phone+OTP)**. Role is a `users.role` column and access is
enforced in a **server-side data layer (`lib/data`)**, not RLS. This is the rebuild from a former pnpm
monorepo of three Vite SPAs on Supabase; **rebuild Phases 1–4 are done** (foundation, and the full admin,
agent, and participant flows) and only **Phase 5 (PWA packaging + deploy)** remains — see `MIGRATION.md`
for the target spec and `README.md` for a fuller product/usage guide.

> The old Vite+Supabase source and its git history are **not in this repo** — they live in gitignored
> local backups (`/legacy/`, `/apps/`, `/.git-legacy-backup/`) that are absent on a fresh clone. Ignore
> any reference to `apps/*`, `packages/*`, `shared/`, `supabase/`, or Supabase RLS/edge-functions: that
> code no longer exists here. Everything below describes the **live single app.**

## Commands

Single npm package (no workspace). Postgres runs in Docker.

```bash
npm install

docker compose up -d db      # Postgres 16, published on HOST port 5433 (host 5432 is taken by a
                             #   native postgresql-x64-16 service — see docker-compose.yml)
npm run db:generate          # drizzle-kit: schema.ts -> SQL migration (offline, no DB needed)
npm run db:migrate           # apply migrations to the DB
npm run db:seed              # idempotent seed; prints the admin login phone (2348000000001)

npm run dev                  # next dev on http://localhost:3000
npm run build                # next build — this runs tsc, so a clean build is the type-check gate
npm run lint                 # eslint . (flat config, see below)
npm run db:studio            # Drizzle Studio;  npm run db:push = throwaway schema push (no migration)
```

There is **no test runner**. "Verification" = `npm run build` (type-check) + `npm run lint`; for behaviour,
run the app and drive the role's screens. End-to-end: seed → `npm run dev` → at `/login` enter the admin
phone → **the OTP is logged to the dev-server console** (dev `SmsProvider` stub) → `/verify` → land on
`/admin`. Seeded logins are in `README.md` (admin `2348000000001`; agents `…002`/`…003` start
pending-approval; participants `…004` active / `…005` pending). Local formats like `08000000001` are
normalized to `234…`.

`.env` (drizzle-kit, via `dotenv/config`) and `.env.local` (Next runtime) both hold `DATABASE_URL`
(`…@localhost:5433/adashi`), `AUTH_SECRET`, `AUTH_TRUST_HOST=true`; both are gitignored. drizzle-kit does
**not** read `.env.local`, so `DATABASE_URL` must be in `.env` too.

## Architecture (the live code)

- `app/` — App Router. Route groups: `(auth)` (login/verify/signup), `(admin)` (pages under
  `app/(admin)/admin/*`: home KPIs, agents, approvals, ledger, disputes, notifications), `(agent)` (the
  field app under `app/(agent)/agent/*`: home, participants, cycles/[cycleId], disputes, history,
  settings — behind a pending-approval gate in its `layout.tsx`), and `(participant)` (the saver app
  under `app/(participant)/participant/*`: dashboard, cycles/[cycleId] read-only calendar, disputes,
  settings). `app/api/otp/send` and `app/api/auth/[...nextauth]` are the auth endpoints.
- `lib/db` — Drizzle `schema.ts` (all tables + pgEnums + `check()`s, incl. the `notifications` dual-shape
  and numeric-money-as-**string**), `client.ts` (postgres.js singleton pinned on `globalThis`),
  `migrations/`, `seed.ts`.
- `lib/auth` — the **edge/Node split that makes phone-login + edge proxy work**: `auth.config.ts`
  (EDGE-safe: callbacks only, no DB — puts `{id, role, phone}` in the JWT/session), `auth.ts` (NODE:
  `NextAuth` + one Credentials `authorize` that accepts **either phone+PIN or phone+code (OTP)**, JWT
  sessions; PIN is the default login, OTP is onboarding/reset only), `otp.ts` (HMAC OTP + `SmsProvider`
  dev stub, plus a per-phone issuance cap), `pin.ts` (scrypt PIN hash + `MAX_PIN_ATTEMPTS`/`PIN_LOCK_MINUTES`
  lockout constants; the lockout — not the hash — is what secures a 6-digit PIN), `phone.ts`
  (`normalizeNgPhone`). **Never import `auth.ts` / `lib/db` from anything reachable by `auth.config.ts` or
  `proxy.ts`** — it pulls Node code into the edge bundle. PIN login is phone+PIN (no SMS); first login and
  "forgot PIN" go through OTP → `/set-pin`. Two non-obvious couplings: (1) lockout surfaces as a
  `PinLockedError` whose `code = "pin_locked"` reaches the client on `signIn(..., {redirect:false}).code`,
  which the login page uses to tell "locked out" from "wrong PIN"; (2) `/set-pin` has **no token** — an
  authenticated session *is* the authorization (a fresh OTP login or an existing session), and the verify
  page routes there via `needsPinAction()` (true when `pinHash` is null).
- `lib/data` — the **RBAC boundary** (replaces Supabase RLS). `session.ts` resolves the caller from the
  session itself — callers never pass their own id/role — via `getSessionOrThrow` / `requireRole(...)`
  (throws `UnauthorizedError` / `ForbiddenError`); every per-domain read function (`admin.ts`, `agents.ts`,
  `approvals.ts`, `ledger.ts`, `disputes.ts`, `notifications.ts`, `agent.ts`, `participant.ts`) scopes its
  query by the caller's role/id. `agent.ts` adds `requireActiveAgent` (also enforces `approvalStatus =
  active`). Mutations are **server actions** in `app/(admin)/admin/*/actions.ts`, `app/(agent)/agent/actions.ts`,
  `app/(participant)/participant/actions.ts`, and `app/(auth)/signup/actions.ts`; the pattern is
  **guard → mutate → `revalidatePath` → dispatch notification**.
- `lib/notifications/dispatch.ts` — outbound-message seam (dev-stubbed): `dispatchAgentApprovalNotification`
  (admin) and `dispatchParticipantNotification` (onboarding|cycle_start|deposit|cycle_close).
- `lib/format.ts` — UI-edge money/format helpers (e.g. `formatNaira`). `components/` — shared UI
  (`Logo`, `ThemeToggle`, `SignOutButton`) + per-role shells (`admin/`, `agent/`, `participant/`).
  `types/next-auth.d.ts` augments the Auth.js session/JWT with `{ id, role, phone }`.
- `proxy.ts` — the **edge role gate** (Next 16 renamed `middleware.ts` → `proxy.ts`). Redirects by path
  prefix (route-group parens don't appear in URLs); unauthenticated → `/login`, wrong-role → that role's
  home. It is a coarse UX redirect — the real security boundary is `lib/data`.
- Path alias `@/*` → repo root (`tsconfig.json`). Styling: CSS-var/glass tokens in `app/globals.css` +
  inline styles; `lucide-react` icons; theme via `<html data-theme>`. Admin/agent pages are RSC that
  refetch per navigation + `revalidatePath` after mutations (no realtime).

### The money math (close a cycle)

A **cycle** is one saver's plan at a fixed `daily_amount`; the agent records one **deposit** per day
(days 1–31, unique per `(cycle, kind, day_of_cycle)`). Deposit **totals are summed in SQL**, never with JS
`Number` math. On close (`app/(agent)/agent/actions.ts`):
`commission = min(chosenCommission, totalDeposited)` and `payout = max(0, totalDeposited − commission)`,
where `chosenCommission` is one day's `daily_amount` for a normal close or an agent-entered amount for an
**early close** (fewer than 15 deposits).

## Conventions & gotchas

- **TypeScript is `strict: true`** (the only strictness flag set). `verbatimModuleSyntax` is **off** and
  `noImplicitAny` is **not** separately enabled. Prefer real types from `lib/db/schema` over `as any`.
- **Money is `numeric(12,2)` → JS `string`.** Never `Number(a) + Number(b)`; sum in SQL and format at the
  UI edge (`lib/format.ts`). The close-cycle `min`/`max` runs in JS on the already-SQL-summed total, then
  `.toFixed(2)` back to a string.
- **Drizzle wraps the driver error**, so a Postgres code (e.g. unique-violation `23505`) can be on `e.code`
  **or** `e.cause.code` — check both (see `app/(agent)/agent/actions.ts`).
- **Notifications are dual-shape.** A DB `CHECK` allows either a full participant notification (participant
  + agent + channel) or an agent-only one (approvals: agent set, participant/channel null).
- **SMS/messaging is pluggable & dev-stubbed.** OTP and outbound messages go through the `SmsProvider` /
  dispatch seams whose dev implementations log to the console; real Termii/Twilio impls drop in behind them.
- **Phone numbers are Nigerian E.164 (`234…`)** — normalize with `normalizeNgPhone` before any lookup/insert.
- **ESLint** uses `eslint.config.mjs` (flat), importing `eslint-config-next/core-web-vitals` and
  `eslint-config-next/typescript` arrays directly (FlatCompat crashes on ESLint 9 + these plugins);
  `legacy/**` and `apps/**` are ignored there and excluded in `tsconfig.json`.
- **`MIGRATION.md`** is the authoritative target spec (its Phase-1 deletions are already done); `README.md`
  is the current product/usage guide. Both describe the live app.

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.
