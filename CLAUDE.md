# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Adashi is a digital community savings / microfinance platform (rotating savings groups) for Nigeria/West Africa.

> **The `MIGRATION.md` rebuild is underway — the repo root is now a single Next.js 16 app.**
> Per `MIGRATION.md`, Adashi is being rebuilt from the old pnpm-monorepo of three Vite SPAs on
> Supabase into **one Next.js 16 (App Router) app on plain Postgres + Drizzle + Auth.js (phone+OTP)**,
> with role as a `users.role` column and access enforced in a **server-side data layer (`lib/data`)**,
> not RLS. **Phases 1–4 are done**: foundation (Drizzle schema, phone-OTP auth, edge role gate), the
> full **admin** flows (Home KPIs, Agents, Approvals, Ledger, Disputes, Notifications), the **agent**
> flows (self-signup, pending-approval gate, provision/link savers, cycles, daily deposits on a 31-day
> grid, close with commission/payout, disputes), and the **participant** flows (login/activation, savings
> dashboard, read-only plan calendar, raise disputes). **Only Phase 5 (PWA packaging + deploy) remains.**
> All roles use **unique-phone + OTP single-auth**; participants are agent-provisioned and auto-activate
> on first OTP. The old Vite+Supabase source is preserved under **`legacy/`** (`legacy/admin|agent|
> participant|packages|supabase`); `legacy/_deprecated/` is throwaway (old node_modules + dead code).
> The **`## Architecture` sections below describe that legacy Vite+Supabase code**, not the live app —
> read them only when porting a legacy flow.

## Commands

The live app uses **npm** (single package, no workspace). Postgres runs in Docker.

```bash
npm install

docker compose up -d db      # Postgres 16, published on HOST port 5433 (host 5432 is taken by a
                             #   native postgresql-x64-16 service — see docker-compose.yml)
npm run db:generate          # drizzle-kit: schema.ts -> SQL migration (offline, no DB needed)
npm run db:migrate           # apply migrations to the DB
npm run db:seed              # idempotent seed; prints the admin login phone (2348000000001)

npm run dev                  # next dev on http://localhost:3000
npm run build                # next build — this runs tsc, so a clean build is the type-check gate
npm run lint                 # eslint . (flat config imports eslint-config-next directly; see below)
```

There is **no test runner**. "Verification" = `npm run build` (type-check) + `npm run lint`. End-to-end:
seed → `npm run dev` → at `/login` enter the admin phone → **the OTP is logged to the dev-server
console** (dev `SmsProvider` stub) → `/verify` → land on `/admin`.

`.env` (drizzle-kit, via `dotenv/config`) and `.env.local` (Next runtime) both hold `DATABASE_URL`
(`…@localhost:5433/adashi`), `AUTH_SECRET`, `AUTH_TRUST_HOST=true`; they are gitignored.

### New-app architecture (the live code)
- `app/` — App Router. Route groups `(auth)` (login/verify/signup), `(admin)` (pages under
  `app/(admin)/admin/*`), `(agent)` (the full field app under `app/(agent)/agent/*` — home, participants,
  cycles/[id], disputes, history, settings, behind a pending-approval gate in its layout), and
  `(participant)` (the saver app under `app/(participant)/participant/*` — savings dashboard,
  cycles/[id] read-only calendar, disputes, settings). `app/api/otp/send` and
  `app/api/auth/[...nextauth]` are the auth endpoints.
- `lib/db` — Drizzle `schema.ts` (all tables + pgEnums + checks incl. the `notifications` dual-shape
  and numeric-money-as-**string**), `client.ts` (postgres.js singleton on `globalThis`), `migrations/`, `seed.ts`.
- `lib/auth` — the **edge/Node split that makes phone-OTP + edge middleware work**: `auth.config.ts`
  (EDGE-safe: callbacks only, no DB), `auth.ts` (NODE: `NextAuth` + Credentials `authorize`, JWT sessions),
  `otp.ts` (HMAC OTP + `SmsProvider` dev stub), `phone.ts` (`normalizeNgPhone`). Never import `auth.ts`/
  `lib/db` from anything reachable by `auth.config.ts` or `proxy.ts` (it would pull Node code into the edge bundle).
- `lib/data` — the **RBAC boundary**: `session.ts` (`getSessionOrThrow`/`requireRole`) + per-domain read
  functions; every function scopes its query by the caller's role/id. `agent.ts` adds `requireActiveAgent`
  (also enforces `approvalStatus = active`). Mutations are server actions in `app/(admin)/admin/*/actions.ts`
  and `app/(agent)/agent/actions.ts` (guard → mutate → `revalidatePath` → dispatch). Money is summed in SQL;
  the close-cycle math is `commission = min(chosen, total_deposited)`, `payout = max(0, total − commission)`.
  Note: drizzle wraps pg errors — check unique-violation code on `e.cause.code`, not `e.code`.
- `lib/notifications/dispatch.ts` — outbound message seam (ported from the edge fns), dev-stubbed:
  `dispatchAgentApprovalNotification` (admin) and `dispatchParticipantNotification`
  (onboarding|cycle_start|deposit|cycle_close).
- `proxy.ts` — the edge role gate (Next 16 renamed `middleware.ts` → `proxy.ts`); redirects by path prefix.
- Path alias `@/*` → repo root (`tsconfig.json`). Styling: CSS-var/glass tokens in `app/globals.css` +
  inline styles (ported from `legacy/packages/ui`); `lucide-react` icons; theme via `<html data-theme>`.
- Supabase Realtime was dropped: admin pages are RSC that refetch per navigation + `revalidatePath` after mutations.
- **Windows note:** the locked `apps/agent/android` Capacitor folder couldn't be removed (Gradle/Studio
  file lock); it's gitignored (`/apps/`) and safe to delete once that process is closed.

## Architecture

### Monorepo layout
- `apps/admin` — admin portal. The **only app with real pages implemented** (`src/pages/`: Home/KPIs, Agents, Approvals, Ledger, Disputes, Notifications, Login). Uses `react-router-dom` v7 with route guards; also contains "Coming Soon" placeholder routes for agent/participant.
- `apps/agent` — field-agent app, plus Capacitor for Android. Currently a large single-file scaffold (`src/App.tsx`).
- `apps/participant` — saver-facing app. Scaffold.
- `packages/db` (`@adashi/db`) — **the real shared code**: Supabase client singleton, DB models, API-response types, and auth/role helpers. Almost everything shared flows through here.
- `packages/ui` (`@adashi/ui`) — currently only `src/theme.css` (CSS-variable design tokens; glass-morphism styling is done with inline styles referencing `hsl(var(--...))`).
- `packages/auth` (`@adashi/auth`) — stub (exports a version string only). Real auth logic lives in `@adashi/db`, not here.

### Path aliases must be kept in sync in two places
Internal packages are consumed as TypeScript source (no build step). Each app resolves them via **both**:
1. `vite.config.ts` → `resolve.alias` (`@adashi/db` → `packages/db/src/index.ts`, `@adashi/ui` → `packages/ui/src`)
2. `tsconfig.app.json` → `compilerOptions.paths`

If you add or rename a shared package, update both in every app or you'll get runtime-vs-typecheck mismatches.

### Auth & roles (the core cross-cutting concept)
There is no role column on `auth.users`. **Role is derived by table membership** in `packages/db/src/auth.ts`: `resolveUserRole()` checks the `admins` → `agents` → `participants` tables in order by `auth.uid()`. `getCurrentAuthUser()` returns an `AuthUser { id, role, ... }`.

- Apps gate routes with `RequireAuth` + `RequireRole` guards (see `apps/admin/src/components/guards/`). Guards call `getCurrentAuthUser` and subscribe to `supabase.auth.onAuthStateChange`.
- **Participants are special**: phone is non-unique (shared devices), so a participant has no `auth.users` row of their own in the normal flow. Their scope is carried by a custom `participant_id` JWT claim, read server-side by the Postgres function `current_participant_id()`. Client side, `setSessionParticipantId()` stores it in `localStorage` under `adashi:participant_id` and refreshes the session.
- Agent self-registration is automatic: signing up with `business_name` in user metadata fires the `handle_new_agent` trigger, creating an `agents` row with `status = 'pending_approval'`. Admins approve via the Approvals page → `agent_approvals_audit`.

### Database & security (`supabase/schema.sql`)
Tables: `admins, agents, participants, agent_participants` (M:N link), `cycles` (a saving plan), `transactions` (deposit/withdrawal, one per cycle/day/kind), `notifications`, `disputes`, `agent_approvals_audit`. `cycle_balances` is a `security_invoker` view for aggregates.

**RLS is enabled on every table and is the security boundary — not app code.** The consistent pattern per table is three policies: admin full access (`is_admin()`), agent scoped by `auth.uid()`/ownership, participant scoped by `current_participant_id()`. Cross-agent participant lookup/linking is done through `SECURITY DEFINER` RPCs (`lookup_participant_by_phone`, `register_or_link_participant`) rather than direct table access. When adding tables or columns, add matching RLS policies in the same three-role shape.

### Edge functions
Deno functions in `supabase/functions/` dispatch WhatsApp/SMS (Twilio / WAAPI / Termii) for approvals and participant events, logging to the `notifications` table. They run with the service role.

## Conventions & gotchas
- **TypeScript is strict** (`strict: true`, `strictNullChecks`, `noUnusedLocals/Parameters`, `verbatimModuleSyntax`). Note `noImplicitAny` is **off**. Prefer real types from `@adashi/db` over `as any`; use `verbatimModuleSyntax`-friendly `import type` for type-only imports.
- **`README.md` is stale** — it documents a pre-monorepo layout (`agent-app/`, `dashboard/`, `participant-app/` at root, npm-per-app). Trust this file and the actual tree, not the README's structure/commands.
- **`shared/` (repo root) is legacy** — a duplicate of `packages/db`'s content left over from the pre-monorepo split. It is not imported anywhere; do not add to it. Put shared code in `packages/db`.
- **`MIGRATION.md` is the authoritative target spec** (Next.js/Postgres/Drizzle/Auth.js — see the note at the top). `SUGGESTED_CHANGES.md`, `adashe-*` plan files, and the `adashe-mvp-plan*.txt`/`.pdf` extracts are older design/roadmap docs (e.g. collapsing the three apps into one); where they conflict with `MIGRATION.md`, the latter wins. All of these describe intended direction, not current state.
- `MIGRATION.md` lists code slated for deletion in Phase 1: root `shared/`, `packages/auth`, the participant JWT-claim path (`setSessionParticipantId` / `current_participant_id()`), root PDF deps (`pdf-parse`, `pdfjs-dist`, `extract_pdf.mjs`), stale `README.md`, and the stray `tash push …` root file. Don't invest in those unless a task is explicitly about the current Supabase app.
- Phone numbers are Nigerian E.164 (`234...`); apps normalize with a `normalizeNgPhone` helper.
- `scripts/dev.js` / `scripts/build.js` shell out to `npm run dev`/`npm run build` inside each app dir (they invoke the per-app scripts, not workspace resolution). `scripts/restore.js` restores a stashed `node_modules/.ignored` per app.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
