# Shared Hour Schedule

A small internal site for a team that shares one working hour every weekday
(Mon–Fri). Team members mark days they'll be unavailable (with a reason),
the app announces it in Slack, and a daily reminder posts at **9:00 AM
Saudi time** each weekday.

Built with Next.js (App Router) + Supabase (Postgres + magic-link auth) +
a Slack incoming webhook + Vercel Cron.

## Features

- **Magic-link sign-in** — no passwords; only allowlisted emails can sign in.
- **Week board** — Mon–Fri view of who's out and why, with week navigation.
- **Mark / edit / remove absences** — each change is announced in Slack.
- **Daily reminder** — 09:00 Asia/Riyadh, Mon–Fri: today's absences (or
  "everyone's in").

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, run the contents of [`supabase/schema.sql`](supabase/schema.sql).
3. Add your team to the allowlist (Table Editor → `allowed_members`), one row
   per person: `email` (lowercase) + `display_name`. Only these emails can
   sign in.
4. **Authentication → Sign In / Up**: make sure the **Email** provider is
   enabled (it is by default; no password required for magic links).
5. **Authentication → URL Configuration**: set your site URL (e.g.
   `https://your-app.vercel.app`) and add
   `https://your-app.vercel.app/auth/confirm` (and
   `http://localhost:3000/auth/confirm` for local dev) to **Redirect URLs**.

### 2. Slack

1. Create an [incoming webhook](https://api.slack.com/messaging/webhooks) for
   your team channel.
2. Copy the webhook URL — it goes in `SLACK_WEBHOOK_URL`.

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API (anon/public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (service_role — keep secret) |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL |
| `CRON_SECRET` | Any long random string (e.g. `openssl rand -hex 32`) |

### 4. Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add all five environment variables in Vercel → Project → Settings →
   Environment Variables.
3. Deploy. `vercel.json` schedules the daily reminder cron
   (`0 6 * * 1-5` UTC = 09:00 Asia/Riyadh, Mon–Fri). When `CRON_SECRET` is
   set, Vercel automatically sends it as a bearer token to the cron route.

## Development

```bash
npm run dev            # start locally on http://localhost:3000
npm test               # run unit tests
npm run test:coverage  # tests + coverage (80% minimum on src/lib)
npm run build          # production build
npm run lint           # eslint
```

## How it works

- All reads/writes go through server route handlers — the browser never sees
  the Slack webhook or service-role key.
- `allowed_members` doubles as the sign-in allowlist and the roster of
  display names.
- One absence row per person per day (`unique (email, date)`); marking the
  same day again just updates the reason.
- If Slack is down, the absence still saves — the UI shows a warning instead
  of losing your entry.
