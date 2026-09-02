# Adashi

A digital community-savings (rotating/daily savings, _adashe / esusu / ajo_) platform for Nigeria and
West Africa. Field **agents** collect small daily contributions from **savers (participants)** over a
cycle, take a commission at the end, and pay out the balance; **admins** oversee agents, the money
ledger, disputes, and notifications.

One **Next.js 16** app serves all three roles ("three interfaces, one auth"), backed by plain
**PostgreSQL** with **Drizzle ORM** and **Auth.js** phone-OTP login. Access control is enforced in a
server-side data layer — there is no RLS.

> **Status:** Phases 1–4 of the rebuild are complete and verified — the **admin**, **agent**, and
> **participant** apps are all functional. Only **Phase 5 (PWA packaging + production deploy)** remains.
> See [`MIGRATION.md`](./MIGRATION.md) for the full plan and [`CLAUDE.md`](./CLAUDE.md) for a working
> guide. The previous Vite + Supabase implementation is archived under `legacy/`.

---

## Table of contents

- [Tech stack](#tech-stack)
- [How it works](#how-it-works)
- [Getting started](#getting-started)
- [Seeded accounts & dev login](#seeded-accounts--dev-login)
- [Walkthroughs](#walkthroughs)
- [Project structure](#project-structure)
- [Data model](#data-model)
- [Key concepts & conventions](#key-concepts--conventions)
- [Scripts](#scripts)
- [Verification](#verification)
- [Deployment (Phase 5)](#deployment-phase-5)

---

## Tech stack

| Area | Choice |
|------|--------|
| Framework | Next.js 16 (App Router, React 19, TypeScript strict) |
| Database | PostgreSQL 16 (Docker for local dev) |
| ORM / migrations | Drizzle ORM + drizzle-kit |
| Auth | Auth.js / NextAuth v5 — **phone + PIN** login (OTP for onboarding & PIN reset), JWT sessions |
| Access control | Server-side data layer (`lib/data`) — no RLS |
| Styling | CSS-variable design tokens + glass-morphism (`app/globals.css`), `lucide-react` icons |
| Package manager | npm |

There is **no test runner**; verification is `npm run build` (which type-checks) + `npm run lint`.

## How it works

### Roles

| Role | App | What they do |
|------|-----|--------------|
| **Admin** | `/admin` | KPIs & savings trend, agent directory (approved agents only), **approve/reject** agent applications, global transaction ledger, dispute mediation, audit logs. In-app notifications on agent & saver registrations. |
| **Agent** | `/agent` | Self-register (pending approval), provision/link savers by phone, start savings **cycles**, mark **daily deposits** on a 31-day card, **close** a cycle (deducting commission → payout), resolve disputes. |
| **Participant** | `/participant` | View savings dashboard & per-plan 31-day calendar, running balance, and **raise disputes** on a recorded deposit. |

### Authentication (single-auth, phone + PIN, OTP for onboarding)

Every role logs in the same way, through one `/login` with two modes. There is **one `users` table with a
`role` column**; a signed **JWT** carries `{ id, role, phone }`, and the edge **proxy** (`proxy.ts`, Next
16's renamed middleware) gates each route group by role.

- **PIN sign-in (default).** Returning users enter phone + a 6-digit PIN — **no SMS is sent**, so login
  costs nothing and works instantly in the field. A PIN is hashed with per-user scrypt (`lib/auth/pin.ts`);
  the real protection against guessing is a **server-side lockout** — 5 wrong attempts locks the account
  for 15 minutes (state on `users.pin_failed_attempts` / `pin_locked_until`).
- **OTP (onboarding + reset).** First-ever login and "forgot PIN" use a 6-digit OTP: `/login` → "one-time
  code" → `/verify`. A first successful OTP **activates a provisioned participant** and then routes to
  `/set-pin` to choose a PIN. OTP issuance is capped at **3 codes per phone per 15 min** to blunt
  SMS-pumping abuse. This is the only path that sends SMS, so it's where the pluggable provider cost lands.
- **Agents** self-register at `/signup` (phone + name + business) → `approval_status = pending_approval`;
  they log in (first via OTP, then set a PIN) but see a **pending screen** until an admin approves them.
- **Participants** are **provisioned by an agent** (not self-registered), created `status = 'pending'`,
  and auto-activate on first OTP. Savers without their own phone are simply managed by their agent.

```mermaid
flowchart LR
  L["/login"] -->|has PIN| PIN["phone + PIN"]
  L -->|first time / forgot| O["OTP (dev: server console)"]
  O --> V["/verify — code"]
  V -->|no PIN yet| SP["/set-pin"]
  SP --> H{role}
  PIN --> H
  H -->|admin| A["/admin"]
  H -->|agent| G{"approved?"}
  H -->|participant| P["/participant"]
  G -->|yes| GA["/agent app"]
  G -->|no| GP["Pending-approval screen"]
```

### The savings cycle (money math)

A **cycle** is one saver's plan at a fixed `daily_amount`. The agent records one **deposit** per day
(days 1–31, chosen on a calendar). On **close**:

- `commission = min(chosenCommission, totalDeposited)` — `chosenCommission` is one day's `daily_amount`
  for a normal close, or an agent-entered amount for an **early close** (fewer than 15 deposits).
- `payout = max(0, totalDeposited − commission)`.

Deposits are unique per `(cycle, kind, day)`, so a day can't be paid twice.

## Getting started

### Prerequisites

- **Node.js 20+** and **npm**
- **Docker** (for local Postgres) — or any Postgres you point `DATABASE_URL` at

### 1. Install

```bash
npm install
```

### 2. Environment

Copy the template to the two env files the app uses — `.env` (read by drizzle-kit) and `.env.local`
(read by the Next.js runtime) — then fill in a real `AUTH_SECRET`:

```bash
cp .env.example .env
cp .env.example .env.local
npx auth secret            # generates a secret; paste it as AUTH_SECRET in both files
```

The variables:

```dotenv
DATABASE_URL=postgres://adashi:adashi@localhost:5433/adashi
AUTH_SECRET=<run: npx auth secret>
AUTH_TRUST_HOST=true
# optional SMS provider vars are documented (commented) in .env.example
```

Both files are gitignored.

### 3. Database

```bash
docker compose up -d db          # Postgres 16 on localhost:5433
npm run db:migrate               # apply migrations
npm run db:seed                  # demo data; prints the admin login phone
```

`npm run db:generate` regenerates SQL migrations from `lib/db/schema.ts` after a schema change (offline —
no DB needed); commit the generated files, then `npm run db:migrate`.

### 4. Run

```bash
npm run dev                      # http://localhost:3000
```

## Seeded accounts & dev login

`npm run db:seed` creates a demo dataset. Seeded active users get **PIN `123456`** — sign in with phone +
PIN for an instant login. For the OTP path (or the pending participant's first login), **there is no real
SMS in development** — the code is printed to the **dev-server console** (the terminal running `npm run
dev`); pick "one-time code" at `/login`, read it from that console, and verify.

| Role | Phone | PIN | Notes |
|------|-------|-----|-------|
| Admin | `2348000000001` | `123456` | Full admin console. |
| Agent | `2348000000002` (Okafor Savings Co.) | `123456` | Created **pending approval** — approve from the admin Approvals page to unlock the agent app. |
| Agent | `2348000000003` (Bello Thrift & Credit) | `123456` | Pending approval. |
| Participant | `2348000000004` (Ngozi) | `123456` | **Active**, has a plan with 5 deposits (₦2,500 saved). |
| Participant | `2348000000005` (Tunde) | — | **Pending** — no PIN yet; first login is via OTP, then set a PIN. |

You can also type a local format (e.g. `08000000001`); numbers are normalized to `234…`. Re-running
`npm run db:seed` on an existing database backfills PINs for the four active users without touching other data.

## Walkthroughs

**Admin**
1. Log in with `2348000000001`.
2. **Overview** shows KPIs (gross volume, active agents, participants, open disputes, commission pool) and
   a 7-day deposit trend.
3. **Approvals** (agents awaiting approval only) → approve `Okafor Savings Co.` (writes an audit entry +
   sends the agent an in-app welcome; the agent now shows in the **Agents Directory** as Active).
4. Browse **Ledger**, **Disputes**, **Audit Logs**; the header **bell** shows in-app notifications.

**Agent** (approve the agent first, above)
1. Log in with `2348000000002`.
2. **Savers** → _Link saver_: enter a phone → link an existing saver or register a new one.
3. Open a saver → _Start a savings plan_ (pick a daily amount).
4. In the plan, tap days on the **contribution card** to record deposits (each prints a receipt).
5. _Close plan_ to compute commission & payout.

**Participant**
1. Log in with `2348000000004`.
2. See **total saved** and your plans; open a plan to view its 31-day calendar.
3. _Report an issue with a deposit_ → raises a dispute the agent and admin can see & resolve.

## Project structure

```
app/
  (auth)/         login (PIN + OTP), verify, set-pin, signup
  (admin)/admin/  home, agents, approvals, ledger, disputes, audit (+ per-page actions.ts)
  (agent)/agent/  home, participants, cycles/[id], disputes, history, settings, actions.ts, layout (pending gate)
  (participant)/participant/  home, cycles/[id], disputes, settings, actions.ts
  api/
    auth/[...nextauth]   Auth.js handlers
    otp/send             POST { phone } → issue + dispatch an OTP (capped per phone/window)
lib/
  db/       schema.ts, client.ts (postgres.js singleton), migrations/, seed.ts
  auth/     auth.config.ts (edge-safe), auth.ts (Node, PIN + OTP authorize), otp.ts (OTP + SmsProvider),
            pin.ts (scrypt PIN hash + lockout constants), phone.ts
  data/     session.ts (requireRole), admin.ts, agents.ts, approvals.ts, ledger.ts, disputes.ts,
            inapp.ts, agent.ts, participant.ts   ← the RBAC boundary
  notifications/  inapp.ts (createNotification / notifyAdmins / recordAudit), actions.ts (mark-read)
  format.ts
components/  Logo, ThemeToggle, SignOutButton, admin/, agent/, participant/
proxy.ts     edge role gate (Next 16 middleware convention)
drizzle.config.ts, docker-compose.yml
legacy/      archived Vite + Supabase apps (reference only; legacy/_deprecated is disposable)
```

## Data model

Core tables (`lib/db/schema.ts`):

- **`users`** — one row per identity; `phone` (unique), `full_name`, `role` (`admin|agent|participant`),
  `status` (`pending|active|suspended`), and PIN-login state (`pin_hash`, `pin_failed_attempts`,
  `pin_locked_until`; `pin_hash` is null until the user sets a PIN).
- **`agent_profiles`** — `business_name`, `approval_status` (`pending_approval|active|suspended|rejected`).
- **`participant_profiles`** — `nickname`, `photo_url`, `registered_by_agent_id`.
- **`agent_participants`** — M:N link (the source of truth for which savers belong to an agent).
- **`cycles`** — a savings plan: `daily_amount`, `status`, `commission`, `payout_amount`, dates.
- **`transactions`** — deposits/withdrawals, unique `(cycle, kind, day_of_cycle)`.
- **`disputes`**, **`audit_log`** (general admin/system trail), **`in_app_notifications`** (recipient-scoped),
  **`otp_codes`**.

## Key concepts & conventions

- **RBAC in the data layer.** Every `lib/data` function calls `requireRole(...)` (or `requireActiveAgent`)
  and scopes its query to the caller's id — this replaces RLS. Mutations are **server actions** that guard,
  mutate, `revalidatePath`, then create in-app notifications / audit rows.
- **Edge/Node auth split.** `lib/auth/auth.config.ts` is edge-safe (callbacks only, no DB) and is what
  `proxy.ts` imports; `lib/auth/auth.ts` is Node-only (the Credentials `authorize` touches the DB). Never
  import `auth.ts`/`lib/db` from anything reachable by the proxy.
- **Money as strings.** `numeric(12,2)` maps to a JS `string`; sums are done in **SQL**, never with JS
  `Number` math. Format at the UI edge with `formatNaira`.
- **In-app notifications.** `in_app_notifications` is recipient-scoped (`recipient_id`, `read_at`); a
  `NotificationBell` in each shell shows the caller's own. Written from server actions via
  `createNotification` / `notifyAdmins`. Recording a deposit produces a **shareable receipt image**
  (canvas → PNG, Web Share / download) instead of an outbound message.
- **SMS is OTP-only & stubbed.** The `SmsProvider` interface in `lib/auth/otp.ts` now carries only the
  login OTP; the dev implementation logs to the console, a real Termii/Twilio impl drops in behind it.
- **Drizzle wraps DB errors** — a Postgres error code (e.g. unique violation `23505`) is on `e.cause.code`,
  not `e.code`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server (http://localhost:3000). |
| `npm run build` | Production build — also the **type-check gate** (runs `tsc`). |
| `npm run start` | Serve the production build. |
| `npm run lint` | ESLint (flat config via `eslint-config-next`). |
| `npm run db:generate` | Generate a SQL migration from the schema (offline). |
| `npm run db:migrate` | Apply migrations. |
| `npm run db:push` | Push the schema directly (throwaway local iteration). |
| `npm run db:seed` | Seed demo data. |
| `npm run db:studio` | Open Drizzle Studio. |

## Verification

No test runner is configured. A change is "verified" when:

```bash
npm run build   # clean build == passing type-check
npm run lint    # clean
```

For behavioural checks, run the app and drive the flow (log in, exercise the role's screens).

## Deployment (Phase 5)

Not built yet. The production checklist:

- **PWA packaging** — web manifest + service worker so the agent/participant apps install to a phone home
  screen (replacing the old Capacitor Android wrapper).
- **Managed Postgres** (e.g. Neon) — set `DATABASE_URL`; run `npm run db:migrate` on deploy.
- **Secrets** — `AUTH_SECRET`, `AUTH_TRUST_HOST`, and (once wired) the SMS provider keys.
- **Real SMS** — implement Termii/Twilio behind the `SmsProvider` seam (login OTP) and select via an env flag.
- **Host** — `next build` + `next start` on your platform of choice.
