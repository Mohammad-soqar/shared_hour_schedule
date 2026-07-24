# Shared Hour Schedule — What This App Is

## The idea

Our team has agreed to work **one shared hour together every day, Monday to
Friday** (weekends off). That only works if everyone knows who's actually
going to be there.

This app is the single place to handle that. If you know you won't make it
on a certain day — travel, a doctor's appointment, anything — you open the
site, pick the day, write a short reason, and you're done. The rest happens
automatically:

- Your absence appears on the team's schedule board.
- A message is posted to the team's Slack channel right away, so nobody has
  to go looking for the information.
- Every weekday morning at **9:00 AM (Saudi time)**, the app posts a
  reminder to Slack: either *"everyone's in!"* or the list of who's out
  today and why.

No spreadsheets, no "did you see my message?", no forgotten heads-ups.

## Who can use it

Only the team. There are no passwords to remember — sign-in works by
**magic link**:

1. Open the site and type your email.
2. If your email is on the team list, you get an email with a sign-in link.
3. Click it — you're in.

If an email is *not* on the team list, the app refuses to send a link and
shows *"This email isn't on the team list — ask the admin to add you."*
The team list is managed by the admin directly in the database dashboard
(Supabase → Table Editor → `allowed_members`).

### Current team

| Name | Email |
|---|---|
| Mohammad Soqar | mnsoqar1@gmail.com |
| Basel Basha | baselbasha136@gmail.com |
| Abdulkerim Sipahi | abdulkerim.sipahi@tigflo.com |
| Roobaan M T | roobaanmt@gmail.com |
| Usama Sipahi | usama.sipahi@tigflo.com |
| Amna Mohamed | amnamohammed1123@gmail.com |

## What you see after signing in

**The schedule board** — a Monday-to-Friday view of the current week
(weekends aren't shown because there's no shared hour then). Each day shows
who's out and their reason; days with nobody out say *"Everyone's in 🎉"*.
Today is highlighted. You can flip forward up to 8 weeks to plan ahead, and
back to earlier weeks of the same range.

**Marking yourself away** — the *"I'll be away…"* button opens a small
form: pick a weekday (today or later, up to 8 weeks out), write a reason
(required, up to 500 characters — the team will see it), save. If you mark
the same day twice, the app just updates your reason rather than creating a
duplicate.

**Your own absences** show **Edit** and **Remove** buttons (only yours —
you can't touch anyone else's):

- *Edit* changes the reason for that day.
- *Remove* cancels the absence. Slack gets a "✅ … is now available" note
  so the team knows plans changed.

## What Slack sees

All messages go to one team channel via a webhook:

| Event | Message |
|---|---|
| You mark a day | 🚫 Mohammad Soqar won't be available Friday, Jul 25 — doctor's appointment |
| You edit the reason | ✏️ Mohammad Soqar's absence on Friday, Jul 25 updated — flight moved |
| You cancel | ✅ Mohammad Soqar is now available Friday, Jul 25 |
| Daily reminder (9:00 AM, Mon–Fri) | ⏰ Shared hour today — everyone's in! *or* ⏰ Shared hour today — out: Sara (travel), Ali (sick) |

If Slack is ever unreachable, your absence still saves — the site just
shows a small "Saved, but the Slack notification failed" warning.

## Weekends — opt-in, not expected

Weekends flip the logic. Monday to Friday everyone is expected at the shared
hour unless they say otherwise; on Saturday and Sunday **nobody** is expected
— but if you feel like working the hour anyway, you **sign up** on the board
(gold sticky notes instead of green). A note is optional, and you can pick a
teammate to invite: the Slack post then says *"🙋 Mohammad is in for the
shared hour Saturday, Jul 25 — shipping the demo · asking Sara to join."*
Pulling out posts a ✋ so nobody waits around. The 9:00 AM roll call runs on
weekends too, but only posts if someone actually signed up.

## The rules the app enforces

- **Weekdays are the default, weekends are opt-in** — absences are for
  Mon–Fri; weekend days take sign-ups instead.
- **No past days** — you can't mark yesterday ("today" is decided by Saudi
  time, Asia/Riyadh).
- **Max 8 weeks ahead** — matching how far the board can display.
- **A reason is required** — a short note is part of the deal; the team
  deserves context.
- **One entry per person per day** — re-marking a day updates it.
- **You can only change your own entries** — enforced both in the app and
  at the database level (row-level security), so it holds even if someone
  bypasses the UI.

## How it's built (the technical part)

| Layer | Choice | Why |
|---|---|---|
| Web app | Next.js (App Router, TypeScript, Tailwind) | Modern React framework, first-class Vercel hosting |
| Hosting | Vercel (free tier) | Zero-ops deploys from GitHub, includes the cron scheduler |
| Database + auth | Supabase (free tier) | Postgres + passwordless magic-link email auth in one service |
| Notifications | Slack incoming webhook | Two-minute setup, no Slack app review needed |
| Daily reminder | Vercel Cron → `/api/cron/daily-reminder` | Runs 06:00 UTC = 09:00 Riyadh, Mon–Fri (`0 6 * * 1-5`) |
| Tests | Vitest | 48 unit tests over the date/validation/Slack/data logic |

### Security design

- The browser never talks to Slack or holds any privileged key. Everything
  sensitive happens in server route handlers.
- Five secrets configured via environment variables (never in code):
  Supabase URL, publishable key, secret (service-role) key, Slack webhook
  URL, and a cron secret.
- The cron endpoint rejects requests without the secret, so outsiders can't
  spam the Slack channel.
- User text is escaped before being sent to Slack, so nobody can smuggle in
  an `@channel` ping or a disguised link through their "reason".
- Database row-level security mirrors the app rules: everyone signed in can
  read the board; you can only write your own rows.

### Data model (two tables)

- **`allowed_members`** — email + display name. Doubles as the sign-in
  allowlist and the source of the names shown on the board and in Slack.
- **`absences`** — who (email), which day, why (reason), with a uniqueness
  rule on (person, day).

## Where everything lives

- **Code:** https://github.com/Mohammad-soqar/shared_hour_schedule
- **Database & team list:** the Supabase project dashboard
- **Setup / deployment guide:** [README.md](../README.md)
- **Design spec & implementation plan:** [docs/superpowers/](superpowers/)

## Day-to-day administration

| Task | How |
|---|---|
| Add a teammate | Supabase → Table Editor → `allowed_members` → Insert row (lowercase email + display name) |
| Remove a teammate | Delete their row (their absences are removed automatically) |
| Change the reminder time | Edit the cron expression in `vercel.json` (it's in UTC; Riyadh = UTC+3) |
| Change the Slack channel | Create a new webhook for the new channel and update `SLACK_WEBHOOK_URL` |
