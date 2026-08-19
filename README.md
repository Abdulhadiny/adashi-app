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
| Auth | Auth.js / NextAuth v5 — **phone + OTP**, JWT sessions |
| Access control | Server-side data layer (`lib/data`) — no RLS |
| Styling | CSS-variable design tokens + glass-morphism (`app/globals.css`), `lucide-react` icons |
| Package manager | npm |

There is **no test runner**; verification is `npm run build` (which type-checks) + `npm run lint`.

## How it works

### Roles

| Role | App | What they do |
|------|-----|--------------|
| **Admin** | `/admin` | KPIs & savings trend, agent directory, **approve/reject** agent applications, global transaction ledger, dispute mediation, notification logs. |
| **Agent** | `/agent` | Self-register (pending approval), provision/link savers by phone, start savings **cycles**, mark **daily deposits** on a 31-day card, **close** a cycle (deducting commission → payout), resolve disputes. |
| **Participant** | `/participant` | View savings dashboard & per-plan 31-day calendar, running balance, and **raise disputes** on a recorded deposit. |

### Authentication (single-auth, phone + OTP)

Every role logs in the same way — enter a phone number at `/login`, receive a 6-digit OTP, verify. There
is **one `users` table with a `role` column**; a signed **JWT** carries `{ id, role, phone }`, and the
edge **proxy** (`proxy.ts`, Next 16's renamed middleware) gates each route group by role.

- **Agents** self-register at `/signup` (phone + name + business) → created with `approval_status =
  pending_approval`; they can log in but see a **pending screen** until an admin approves them.
- **Participants** are **provisioned by an agent** (not self-registered), created `status = 'pending'`,
  and **auto-activate on their first successful OTP**. Savers without their own phone are simply managed
  by their agent.

```mermaid
flowchart LR
  L["/login — phone"] --> O["OTP (dev: server console)"]
  O --> V["/verify — code"]
  V -->|role=admin| A["/admin"]
  V -->|role=agent| G{"approved?"}
  V -->|role=participant| P["/participant"]
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

> **Port 5433, not 5432.** The bundled `docker-compose.yml` publishes Postgres on host port **5433** so
> it doesn't collide with a native Postgres install commonly on 5432. If nothing else uses 5432, you can
> change the compose mapping and the URL to `5432`.

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

`npm run db:seed` creates a demo dataset. **In development there is no real SMS** — the OTP is printed to
the **dev-server console** (the terminal running `npm run dev`). Enter the phone at `/login`, read the
code from that console, and verify.

| Role | Phone | Notes |
|------|-------|-------|
| Admin | `2348000000001` | Full admin console. |
| Agent | `2348000000002` (Okafor Savings Co.) | Created **pending approval** — approve from the admin Approvals page to unlock the agent app. |
| Agent | `2348000000003` (Bello Thrift & Credit) | Pending approval. |
| Participant | `2348000000004` (Ngozi) | **Active**, has a plan with 5 deposits (₦2,500 saved). |
| Participant | `2348000000005` (Tunde) | **Pending** — activates on first OTP login. |

You can also type a local format (e.g. `08000000001`); numbers are normalized to `234…`.

## Walkthroughs

**Admin**
1. Log in with `2348000000001`.
2. **Overview** shows KPIs (gross volume, active agents, participants, open disputes, commission pool) and
   a 7-day deposit trend.
3. **Approvals** → approve `Okafor Savings Co.` (writes an audit entry + queues an approval notification).
4. Browse **Ledger**, **Disputes**, **Notifications**.

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
  (auth)/         login, verify, signup
  (admin)/admin/  home, agents, approvals, ledger, disputes, notifications (+ per-page actions.ts)
  (agent)/agent/  home, participants, cycles/[id], disputes, history, settings, actions.ts, layout (pending gate)
  (participant)/participant/  home, cycles/[id], disputes, settings, actions.ts
  api/
    auth/[...nextauth]   Auth.js handlers
    otp/send             POST { phone } → issue + dispatch an OTP
lib/
  db/       schema.ts, client.ts (postgres.js singleton), migrations/, seed.ts
  auth/     auth.config.ts (edge-safe), auth.ts (Node), otp.ts (OTP + SmsProvider), phone.ts
  data/     session.ts (requireRole), admin.ts, agents.ts, approvals.ts, ledger.ts, disputes.ts,
            notifications.ts, agent.ts, participant.ts   ← the RBAC boundary
  notifications/  dispatch.ts (agent-approval + participant message seams)
  format.ts
components/  Logo, ThemeToggle, SignOutButton, admin/, agent/, participant/
proxy.ts     edge role gate (Next 16 middleware convention)
drizzle.config.ts, docker-compose.yml
legacy/      archived Vite + Supabase apps (reference only; legacy/_deprecated is disposable)
```

## Data model

Core tables (`lib/db/schema.ts`):

- **`users`** — one row per identity; `phone` (unique), `full_name`, `role` (`admin|agent|participant`),
  `status` (`pending|active|suspended`).
- **`agent_profiles`** — `business_name`, `approval_status` (`pending_approval|active|suspended|rejected`).
- **`participant_profiles`** — `nickname`, `photo_url`, `registered_by_agent_id`.
- **`agent_participants`** — M:N link (the source of truth for which savers belong to an agent).
- **`cycles`** — a savings plan: `daily_amount`, `status`, `commission`, `payout_amount`, dates.
- **`transactions`** — deposits/withdrawals, unique `(cycle, kind, day_of_cycle)`.
- **`disputes`**, **`agent_approvals_audit`**, **`notifications`**, **`otp_codes`**.

## Key concepts & conventions

- **RBAC in the data layer.** Every `lib/data` function calls `requireRole(...)` (or `requireActiveAgent`)
  and scopes its query to the caller's id — this replaces RLS. Mutations are **server actions** that guard,
  mutate, `revalidatePath`, and dispatch notifications.
- **Edge/Node auth split.** `lib/auth/auth.config.ts` is edge-safe (callbacks only, no DB) and is what
  `proxy.ts` imports; `lib/auth/auth.ts` is Node-only (the Credentials `authorize` touches the DB). Never
  import `auth.ts`/`lib/db` from anything reachable by the proxy.
- **Money as strings.** `numeric(12,2)` maps to a JS `string`; sums are done in **SQL**, never with JS
  `Number` math. Format at the UI edge with `formatNaira`.
- **Notifications are dual-shape.** A DB `CHECK` allows either a full participant notification
  (participant + agent + channel) or an agent-only one (approvals: agent set, participant/channel null).
- **SMS is pluggable & stubbed.** OTP and outbound messages go through `SmsProvider` / `MessageProvider`
  interfaces; the dev implementations log to the console. Real Termii/Twilio implementations drop in behind
  them for production.
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
- **Real SMS** — implement Termii/Twilio behind the `SmsProvider` / `MessageProvider` seams and select via
  an env flag.
- **Host** — `next build` + `next start` on your platform of choice.
