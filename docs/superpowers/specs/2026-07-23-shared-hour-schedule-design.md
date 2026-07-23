# Shared Hour Schedule — Design Spec

Date: 2026-07-23
Status: Approved

## Purpose

A small internal website for a team that shares one working hour every weekday
(Mon–Fri, no weekends). Team members mark days they will be unavailable, with a
reason, ahead of time. The app announces absences (and changes) to the team's
Slack channel and posts a daily morning reminder.

## Stack

- **Next.js** (App Router, TypeScript, Tailwind CSS) — hosted on Vercel.
- **Supabase** — Postgres database + magic-link (passwordless email) auth.
- **Slack incoming webhook** — notifications to the team channel.
- **Vercel Cron** — daily weekday reminder.

## Authentication & Access

- Sign-in via Supabase magic link: user enters email, receives a link, clicks it.
- **Allowlist:** before sending a magic link, the server checks the email against
  the `allowed_members` table. Emails not on the list are rejected with a
  friendly "ask the admin to add you" message.
- The allowlist holds arbitrary emails (no domain restriction). Managed directly
  in the Supabase dashboard (add row: email + display name).

## Data Model (Supabase Postgres)

### `allowed_members`
| column | type | notes |
|---|---|---|
| email | text, PK | lowercase |
| display_name | text | shown on the board and in Slack messages |
| created_at | timestamptz | default now() |

### `absences`
| column | type | notes |
|---|---|---|
| id | uuid, PK | default gen_random_uuid() |
| email | text | FK → allowed_members.email |
| date | date | weekday only (enforced server-side) |
| reason | text | required, max ~500 chars |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| UNIQUE (email, date) | | marking the same day again updates the reason |

### Row Level Security
- All authenticated allowlisted users can **read** all rows of both tables.
- Users can **insert/update/delete** only their own `absences` rows
  (matched by JWT email).
- Writes flow through server-side route handlers, but RLS is enabled as
  defense in depth.

## Pages

1. **`/login`** — email input → "Send me a link". Shows allowlist rejection
   message when applicable. Auth callback route completes the session.
2. **`/` (Schedule board)** — Mon–Fri week view. Each day column lists who is
   out and why. Navigation between current and future weeks. Weekends are not
   rendered. Today is visually highlighted.
3. **Mark absence** (dialog/section on the board) — date picker limited to
   weekdays, today or future; required reason field; submit. The user's own
   absences show **edit** and **remove** actions.

## API (server-side route handlers)

- `POST /api/auth/magic-link` — validates email against allowlist, triggers
  Supabase magic link.
- `POST /api/absences` — create/update own absence (upsert on email+date).
  Validates: weekday, not in the past, reason present.
- `DELETE /api/absences/:id` — remove own absence.
- `GET /api/absences?from=&to=` — list absences for the visible week range.
- `GET /api/cron/daily-reminder` — Vercel Cron target, Mon–Fri 06:00 UTC
  (09:00 Asia/Riyadh). Protected by `CRON_SECRET` bearer check.

The browser never talks to Slack; all Slack calls happen server-side.

## Slack Notifications (incoming webhook)

- **Marked absent:** "🚫 {name} won't be available {weekday}, {date} — {reason}"
- **Reason edited:** "✏️ {name}'s absence on {weekday}, {date} updated — {reason}"
- **Cancelled:** "✅ {name} is now available {weekday}, {date}"
- **Daily reminder (09:00 Riyadh, Mon–Fri):**
  - No absences: "⏰ Shared hour today — everyone's in!"
  - With absences: "⏰ Shared hour today — out: {name} ({reason}), …"

## Configuration (environment variables)

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `SLACK_WEBHOOK_URL` (server only)
- `CRON_SECRET` (server only)

No secrets in source. Required vars validated at startup.

## Error Handling

- Slack failure never blocks a save: absence persists, UI shows
  "Saved, but the Slack notification failed."
- Validation errors return clear messages (past date, weekend, empty reason,
  not allowlisted).
- Cron route returns 401 without valid secret.

## Timezone

All "today"/weekday logic uses **Asia/Riyadh** (UTC+3, no DST).

## Testing

- Unit tests: date/weekday/timezone helpers, validation, Slack message
  formatting.
- Integration tests: absence API routes (mocked Supabase + Slack).
- Target ≥80% coverage on lib/ and API logic.

## Out of Scope

- Tracking completion of the shared hour itself.
- Admin UI for the allowlist (managed via Supabase dashboard).
- Slack bot features (DMs, mentions, message editing).
