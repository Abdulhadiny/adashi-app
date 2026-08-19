# Adashi — Migration & Target Architecture

Rebuild of Adashi from the current **Vite + Supabase monorepo** to a single **Next.js + Postgres** app with role-based access control. This doc is the source of truth for the target; it supersedes the stale `README.md` and the still-relevant parts of `SUGGESTED_CHANGES.md`.

## Decisions (locked)

| Area | Decision |
|------|----------|
| Framework | **Next.js 16** (App Router), one app for all three interfaces |
| Database | **Plain Postgres** (Neon or self-hosted) — Supabase dropped entirely |
| ORM | **Drizzle** (typed schema + migrations) |
| Auth | **Auth.js / NextAuth v5**, **phone + OTP** for every role (OTP via existing Termii/Twilio) |
| Roles | `admin`, `agent`, `participant` — a `role` on one users table (RBAC) |
| Access control | Enforced in a **server-side data layer** — no RLS |
| Packaging | Agent = installable **PWA** (not Capacitor) — *pending final confirm* |

## Why the stack change

- The three Vite SPAs → one Next.js app with route groups behind a single `middleware.ts` auth gate ("three interfaces, one auth").
- Role stops being "which table is your row in" and becomes a `role` column + session claim.
- Supabase's RLS/edge-functions/auth are replaced by: Auth.js sessions, Postgres, and a server data layer where every query is scoped by the caller's role + id. Riskiest part (auth) is delegated to Auth.js rather than hand-rolled.

## Identity & the agent↔participant link

All three roles are real auth users (phone + OTP). The subtlety is the participant lifecycle:

1. **Agent provisions** a participant in the field: creates a `users` row (`role=participant`, unique phone, `status=pending`) **and** an active `agent_participants` row.
2. **Participant activates** later by requesting an OTP to that phone — same row, now `status=active`.
3. The **`agent_participants` M:N join is the source of truth** for who a participant belongs to (supports multiple agents); `registered_by_agent_id` records who onboarded them.

This retires the old shared-phone / non-unique-phone model and the `participant_id` JWT-claim hack (`current_participant_id()`).

## Schema (target, summarized)

- **`users`** — `id, phone (unique), full_name, role, status, created_at, updated_at`
- **`agent_profiles`** — `user_id (pk→users), business_name, approval_status(pending_approval|active|suspended|rejected)`
- **`participant_profiles`** — `user_id (pk→users), nickname, photo_url, registered_by_agent_id(→users)`
- **`agent_participants`** — `agent_id, participant_id, status(active|inactive)`, pk`(agent_id, participant_id)`
- **`cycles`** — `id, agent_id, participant_id, daily_amount, status, start_date, end_date, commission, payout_amount, …`
- **`transactions`** — `id, cycle_id, kind(deposit|withdrawal), day_of_cycle, amount`, unique`(cycle_id, kind, day_of_cycle)`
- **`notifications`**, **`disputes`**, **`agent_approvals_audit`** — carried over largely as-is
- **`otp_codes`** — `phone, code_hash, expires_at, consumed_at` (OTP flow) + Auth.js's own tables

Access rules (server data layer): **admin** → all; **agent** → rows linked via active `agent_participants` / owned cycles; **participant** → self only. `register_or_link_participant` becomes a server function, not a Postgres RPC.

## Proposed directory layout

```
app/
  (auth)/login, verify        # phone entry + OTP verify
  (admin)/…                   # ported from apps/admin
  (agent)/…
  (participant)/…
  api/…                       # route handlers (OTP send/verify, notifications)
lib/
  db/                         # drizzle schema, client, migrations
  auth/                       # auth.js config + OTP
  data/                       # scoped data-access functions = the RBAC boundary
middleware.ts                 # single auth/role gate
```

## Phases

1. **Foundation & cleanup** — scaffold Next.js app; Drizzle schema + first migration; Auth.js phone-OTP + middleware; role claim; login → empty admin shell. Delete dead code (see below).
2. **Admin flows** — Agents, Approvals, Ledger, Disputes, Notifications.
3. **Agent flows** — provision/register participant, cycles, deposits & withdrawals.
4. **Participant flows** — activation via OTP, savings dashboard, disputes.
5. **PWA packaging + deploy.**

## Deleted in Phase 1

- Root `shared/` (legacy duplicate of `packages/db`)
- `packages/auth` (stub)
- Participant JWT-claim code: `setSessionParticipantId`, `current_participant_id()`, participant-scoped RLS
- Root PDF deps: `pdf-parse`, `pdfjs-dist`, `extract_pdf.mjs`
- Stale `README.md`; stray `tash push …` root file
- The three separate Vite apps (folded into the Next.js app)
