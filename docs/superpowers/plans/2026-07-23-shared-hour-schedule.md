# Shared Hour Schedule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Next.js site where allowlisted team members mark weekday absences (with reasons) for the daily shared hour; the app announces changes to Slack and posts a 9:00 AM Riyadh weekday reminder.

**Architecture:** Next.js App Router on Vercel. All writes go through server route handlers that use Supabase (Postgres + magic-link auth) and post to a Slack incoming webhook. A Vercel Cron hits a secret-protected route for the daily reminder. Pure logic (dates, validation, Slack formatting, absence service) lives in `src/lib/` and is unit-tested with Vitest; Supabase access is injected so services are testable with a fake client.

**Tech Stack:** Next.js (App Router, TypeScript, Tailwind), @supabase/supabase-js + @supabase/ssr, Vitest + @vitest/coverage-v8.

## Global Constraints

- Timezone for all "today"/weekday logic: **Asia/Riyadh** (UTC+3, no DST).
- Weekend = Saturday + Sunday; absences allowed Mon–Fri only, today or future.
- Reason: required, max 500 chars.
- One absence row per (email, date) — re-marking updates the reason.
- Slack failure must never block a save.
- Secrets only via env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SLACK_WEBHOOK_URL`, `CRON_SECRET`.
- Coverage target ≥80% on `src/lib/`.
- Commit after every green test cycle, conventional commit format, no attribution footer.

---

### Task 1: Scaffold project + test infrastructure

**Files:**
- Create: Next.js scaffold (via create-next-app), `vitest.config.ts`, `src/lib/smoke.test.ts` (deleted at end of task)

**Interfaces:**
- Produces: a running Next.js + Vitest toolchain; `npm test` runs Vitest.

- [ ] **Step 1: Scaffold.** create-next-app refuses non-empty dirs, so scaffold into a temp dir and move files in:

```powershell
npx --yes create-next-app@latest _scaffold --ts --tailwind --eslint --app --src-dir --use-npm --no-import-alias --no-turbopack
Move-Item _scaffold/* . -Force; Move-Item _scaffold/.* . -Force -ErrorAction SilentlyContinue; Remove-Item _scaffold -Recurse -Force
```

(Merge `.gitignore` if one already exists. Keep `docs/`.)

- [ ] **Step 2: Install deps**

```powershell
npm install @supabase/supabase-js @supabase/ssr
npm install -D vitest @vitest/coverage-v8
```

- [ ] **Step 3: Vitest config** — `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: { provider: 'v8', include: ['src/lib/**'], thresholds: { lines: 80 } },
  },
})
```

Add to `package.json` scripts: `"test": "vitest run", "test:coverage": "vitest run --coverage"`.

- [ ] **Step 4: Smoke test passes** — `src/lib/smoke.test.ts` with `expect(1+1).toBe(2)`; run `npm test`, expect PASS; delete the file.

- [ ] **Step 5: Commit** — `chore: scaffold next.js app with vitest`

---

### Task 2: Date helpers (`src/lib/dates.ts`)

**Files:**
- Create: `src/lib/dates.ts`, Test: `src/lib/dates.test.ts`

**Interfaces:**
- Produces:
  - `todayInRiyadh(): string` — `'YYYY-MM-DD'`
  - `isWeekend(date: string): boolean`
  - `isPastDate(date: string, today: string): boolean`
  - `isValidDateString(date: string): boolean`
  - `weekdaysOfWeek(today: string, offsetWeeks: number): string[]` — the Mon–Fri dates of today's week + offset
  - `formatHuman(date: string): string` — e.g. `'Friday, Jul 25'`

- [ ] **Step 1: Write failing tests** — `src/lib/dates.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { formatHuman, isPastDate, isValidDateString, isWeekend, todayInRiyadh, weekdaysOfWeek } from './dates'

describe('todayInRiyadh', () => {
  test('returns a YYYY-MM-DD string', () => {
    expect(todayInRiyadh()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('isWeekend', () => {
  test('Saturday is weekend', () => expect(isWeekend('2026-07-25')).toBe(true))
  test('Sunday is weekend', () => expect(isWeekend('2026-07-26')).toBe(true))
  test('Friday is not weekend', () => expect(isWeekend('2026-07-24')).toBe(false))
  test('Monday is not weekend', () => expect(isWeekend('2026-07-27')).toBe(false))
})

describe('isPastDate', () => {
  test('yesterday is past', () => expect(isPastDate('2026-07-22', '2026-07-23')).toBe(true))
  test('today is not past', () => expect(isPastDate('2026-07-23', '2026-07-23')).toBe(false))
  test('tomorrow is not past', () => expect(isPastDate('2026-07-24', '2026-07-23')).toBe(false))
})

describe('isValidDateString', () => {
  test('accepts real date', () => expect(isValidDateString('2026-07-23')).toBe(true))
  test('rejects garbage', () => expect(isValidDateString('not-a-date')).toBe(false))
  test('rejects impossible date', () => expect(isValidDateString('2026-02-30')).toBe(false))
})

describe('weekdaysOfWeek', () => {
  test('returns Mon-Fri of current week for a Thursday', () => {
    expect(weekdaysOfWeek('2026-07-23', 0)).toEqual([
      '2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24',
    ])
  })
  test('offset 1 returns next week', () => {
    expect(weekdaysOfWeek('2026-07-23', 1)[0]).toBe('2026-07-27')
  })
  test('works when today is Sunday (start of JS week)', () => {
    expect(weekdaysOfWeek('2026-07-26', 0)[0]).toBe('2026-07-20')
  })
})

describe('formatHuman', () => {
  test('formats as weekday + short month + day', () => {
    expect(formatHuman('2026-07-24')).toBe('Friday, Jul 24')
  })
})
```

- [ ] **Step 2: Run, expect FAIL** — `npm test -- dates` → "Cannot find module './dates'".

- [ ] **Step 3: Implement** — `src/lib/dates.ts`:

```ts
const RIYADH_TZ = 'Asia/Riyadh'
const DAYS_PER_WEEK = 7
const WEEKDAYS_SHOWN = 5

export function todayInRiyadh(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: RIYADH_TZ }).format(new Date())
}

function toUtcDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`)
}

export function isValidDateString(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const parsed = toUtcDate(date)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
}

export function isWeekend(date: string): boolean {
  const day = toUtcDate(date).getUTCDay()
  return day === 6 || day === 0
}

export function isPastDate(date: string, today: string): boolean {
  return date < today
}

export function weekdaysOfWeek(today: string, offsetWeeks: number): string[] {
  const base = toUtcDate(today)
  const daysSinceMonday = (base.getUTCDay() + 6) % DAYS_PER_WEEK
  const monday = new Date(base)
  monday.setUTCDate(base.getUTCDate() - daysSinceMonday + offsetWeeks * DAYS_PER_WEEK)
  return Array.from({ length: WEEKDAYS_SHOWN }, (_, i) => {
    const d = new Date(monday)
    d.setUTCDate(monday.getUTCDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

export function formatHuman(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC',
  }).format(toUtcDate(date))
}
```

- [ ] **Step 4: Run, expect PASS** — `npm test -- dates`
- [ ] **Step 5: Commit** — `feat: add riyadh date helpers`

---

### Task 3: Validation (`src/lib/validation.ts`)

**Files:**
- Create: `src/lib/validation.ts`, Test: `src/lib/validation.test.ts`

**Interfaces:**
- Consumes: `isValidDateString`, `isWeekend`, `isPastDate` from `./dates`
- Produces: `validateAbsenceInput(input: unknown, today: string): { ok: true; value: { date: string; reason: string } } | { ok: false; error: string }`

- [ ] **Step 1: Write failing tests** — `src/lib/validation.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { validateAbsenceInput } from './validation'

const TODAY = '2026-07-23' // Thursday

describe('validateAbsenceInput', () => {
  test('accepts a valid weekday absence', () => {
    const result = validateAbsenceInput({ date: '2026-07-24', reason: 'doctor appointment' }, TODAY)
    expect(result).toEqual({ ok: true, value: { date: '2026-07-24', reason: 'doctor appointment' } })
  })
  test('trims the reason', () => {
    const result = validateAbsenceInput({ date: '2026-07-24', reason: '  travel  ' }, TODAY)
    expect(result.ok && result.value.reason).toBe('travel')
  })
  test('rejects non-object input', () => {
    expect(validateAbsenceInput(null, TODAY).ok).toBe(false)
  })
  test('rejects malformed date', () => {
    const result = validateAbsenceInput({ date: 'tomorrow', reason: 'x' }, TODAY)
    expect(!result.ok && result.error).toMatch(/date/i)
  })
  test('rejects weekend', () => {
    const result = validateAbsenceInput({ date: '2026-07-25', reason: 'x' }, TODAY)
    expect(!result.ok && result.error).toMatch(/weekend/i)
  })
  test('rejects past date', () => {
    const result = validateAbsenceInput({ date: '2026-07-22', reason: 'x' }, TODAY)
    expect(!result.ok && result.error).toMatch(/past/i)
  })
  test('rejects empty reason', () => {
    const result = validateAbsenceInput({ date: '2026-07-24', reason: '   ' }, TODAY)
    expect(!result.ok && result.error).toMatch(/reason/i)
  })
  test('rejects reason over 500 chars', () => {
    const result = validateAbsenceInput({ date: '2026-07-24', reason: 'a'.repeat(501) }, TODAY)
    expect(!result.ok && result.error).toMatch(/500/)
  })
})
```

- [ ] **Step 2: Run, expect FAIL** — `npm test -- validation`

- [ ] **Step 3: Implement** — `src/lib/validation.ts`:

```ts
import { isPastDate, isValidDateString, isWeekend } from './dates'

const MAX_REASON_LENGTH = 500

export type AbsenceInput = { date: string; reason: string }
export type ValidationResult =
  | { ok: true; value: AbsenceInput }
  | { ok: false; error: string }

export function validateAbsenceInput(input: unknown, today: string): ValidationResult {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: 'Invalid request body.' }
  }
  const { date, reason } = input as Record<string, unknown>
  if (typeof date !== 'string' || !isValidDateString(date)) {
    return { ok: false, error: 'Please pick a valid date.' }
  }
  if (isWeekend(date)) {
    return { ok: false, error: 'That day is a weekend — the shared hour only runs Monday to Friday.' }
  }
  if (isPastDate(date, today)) {
    return { ok: false, error: 'That date is in the past.' }
  }
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    return { ok: false, error: 'Please add a short reason.' }
  }
  const trimmed = reason.trim()
  if (trimmed.length > MAX_REASON_LENGTH) {
    return { ok: false, error: 'Reason is too long (max 500 characters).' }
  }
  return { ok: true, value: { date, reason: trimmed } }
}
```

- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit** — `feat: add absence input validation`

---

### Task 4: Slack module (`src/lib/slack.ts`)

**Files:**
- Create: `src/lib/slack.ts`, Test: `src/lib/slack.test.ts`

**Interfaces:**
- Consumes: `formatHuman` from `./dates`
- Produces:
  - `absenceMarkedMessage(name: string, date: string, reason: string): string`
  - `absenceUpdatedMessage(name: string, date: string, reason: string): string`
  - `absenceCancelledMessage(name: string, date: string): string`
  - `dailyReminderMessage(absences: { name: string; reason: string }[]): string`
  - `sendSlackMessage(text: string): Promise<boolean>` — POSTs `{ text }` to `process.env.SLACK_WEBHOOK_URL`; returns `false` (never throws) on any failure or missing env.

- [ ] **Step 1: Write failing tests** — `src/lib/slack.test.ts`:

```ts
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  absenceCancelledMessage, absenceMarkedMessage, absenceUpdatedMessage,
  dailyReminderMessage, sendSlackMessage,
} from './slack'

describe('message formatting', () => {
  test('marked', () => {
    expect(absenceMarkedMessage('Sara', '2026-07-24', 'travel'))
      .toBe("🚫 Sara won't be available Friday, Jul 24 — travel")
  })
  test('updated', () => {
    expect(absenceUpdatedMessage('Sara', '2026-07-24', 'sick'))
      .toBe("✏️ Sara's absence on Friday, Jul 24 updated — sick")
  })
  test('cancelled', () => {
    expect(absenceCancelledMessage('Sara', '2026-07-24'))
      .toBe('✅ Sara is now available Friday, Jul 24')
  })
  test('reminder with nobody out', () => {
    expect(dailyReminderMessage([])).toBe("⏰ Shared hour today — everyone's in!")
  })
  test('reminder with people out', () => {
    expect(dailyReminderMessage([{ name: 'Sara', reason: 'travel' }, { name: 'Ali', reason: 'sick' }]))
      .toBe('⏰ Shared hour today — out: Sara (travel), Ali (sick)')
  })
})

describe('sendSlackMessage', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  test('posts text to webhook and returns true', async () => {
    vi.stubEnv('SLACK_WEBHOOK_URL', 'https://hooks.slack.example/x')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    expect(await sendSlackMessage('hello')).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith('https://hooks.slack.example/x', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'hello' }),
    })
  })
  test('returns false when fetch rejects', async () => {
    vi.stubEnv('SLACK_WEBHOOK_URL', 'https://hooks.slack.example/x')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')))
    expect(await sendSlackMessage('hello')).toBe(false)
  })
  test('returns false on non-2xx response', async () => {
    vi.stubEnv('SLACK_WEBHOOK_URL', 'https://hooks.slack.example/x')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await sendSlackMessage('hello')).toBe(false)
  })
  test('returns false when env missing', async () => {
    vi.stubEnv('SLACK_WEBHOOK_URL', '')
    expect(await sendSlackMessage('hello')).toBe(false)
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement** — `src/lib/slack.ts`:

```ts
import { formatHuman } from './dates'

export function absenceMarkedMessage(name: string, date: string, reason: string): string {
  return `🚫 ${name} won't be available ${formatHuman(date)} — ${reason}`
}

export function absenceUpdatedMessage(name: string, date: string, reason: string): string {
  return `✏️ ${name}'s absence on ${formatHuman(date)} updated — ${reason}`
}

export function absenceCancelledMessage(name: string, date: string): string {
  return `✅ ${name} is now available ${formatHuman(date)}`
}

export function dailyReminderMessage(absences: { name: string; reason: string }[]): string {
  if (absences.length === 0) return "⏰ Shared hour today — everyone's in!"
  const out = absences.map((a) => `${a.name} (${a.reason})`).join(', ')
  return `⏰ Shared hour today — out: ${out}`
}

export async function sendSlackMessage(text: string): Promise<boolean> {
  const url = process.env.SLACK_WEBHOOK_URL
  if (!url) {
    console.error('SLACK_WEBHOOK_URL is not set; skipping Slack notification')
    return false
  }
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!response.ok) {
      console.error(`Slack webhook responded with non-OK status`)
      return false
    }
    return true
  } catch (error) {
    console.error('Slack webhook request failed', error)
    return false
  }
}
```

- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit** — `feat: add slack messages and webhook sender`

---

### Task 5: Absence service (`src/lib/absences.ts`)

**Files:**
- Create: `src/lib/absences.ts`, Test: `src/lib/absences.test.ts`

**Interfaces:**
- Produces (all take a Supabase-shaped `db` as first arg — typed loosely as `Db` so a fake works in tests):
  - `type AbsenceRecord = { id: string; email: string; date: string; reason: string }`
  - `checkAllowed(db, email): Promise<{ email: string; display_name: string } | null>`
  - `upsertAbsence(db, email, date, reason): Promise<{ absence: AbsenceRecord; wasUpdate: boolean }>`
  - `deleteAbsence(db, email, id): Promise<{ id: string; date: string } | null>`
  - `listAbsences(db, from, to): Promise<Array<AbsenceRecord & { display_name: string }>>`

- [ ] **Step 1: Write failing tests** — `src/lib/absences.test.ts`. The fake db returns queued `{ data, error }` results; every chain method returns the builder, terminal `single`/`maybeSingle` and direct `await` consume the queue:

```ts
import { describe, expect, test } from 'vitest'
import { checkAllowed, deleteAbsence, listAbsences, upsertAbsence, type Db } from './absences'

type Result = { data: unknown; error: { message: string } | null }

function fakeDb(...results: Result[]): Db {
  let i = 0
  const next = () => results[i++]
  const builder: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'gte', 'lte', 'order', 'upsert', 'delete', 'insert']) {
    builder[m] = () => builder
  }
  builder.maybeSingle = () => Promise.resolve(next())
  builder.single = () => Promise.resolve(next())
  builder.then = (resolve: (r: Result) => unknown) => Promise.resolve(next()).then(resolve)
  return { from: () => builder } as unknown as Db
}

describe('checkAllowed', () => {
  test('returns member when allowlisted', async () => {
    const member = { email: 'sara@x.com', display_name: 'Sara' }
    expect(await checkAllowed(fakeDb({ data: member, error: null }), 'Sara@X.com')).toEqual(member)
  })
  test('returns null when not allowlisted', async () => {
    expect(await checkAllowed(fakeDb({ data: null, error: null }), 'no@x.com')).toBeNull()
  })
  test('throws on db error', async () => {
    await expect(checkAllowed(fakeDb({ data: null, error: { message: 'boom' } }), 'a@x.com'))
      .rejects.toThrow('boom')
  })
})

describe('upsertAbsence', () => {
  const row = { id: 'u1', email: 'sara@x.com', date: '2026-07-24', reason: 'travel' }
  test('creates when none exists (wasUpdate false)', async () => {
    const db = fakeDb({ data: null, error: null }, { data: row, error: null })
    expect(await upsertAbsence(db, 'sara@x.com', '2026-07-24', 'travel'))
      .toEqual({ absence: row, wasUpdate: false })
  })
  test('updates when one exists (wasUpdate true)', async () => {
    const db = fakeDb({ data: { id: 'u1' }, error: null }, { data: row, error: null })
    expect((await upsertAbsence(db, 'sara@x.com', '2026-07-24', 'travel')).wasUpdate).toBe(true)
  })
  test('throws on db error', async () => {
    const db = fakeDb({ data: null, error: null }, { data: null, error: { message: 'nope' } })
    await expect(upsertAbsence(db, 'sara@x.com', '2026-07-24', 'x')).rejects.toThrow('nope')
  })
})

describe('deleteAbsence', () => {
  test('returns deleted row', async () => {
    const db = fakeDb({ data: { id: 'u1', date: '2026-07-24' }, error: null })
    expect(await deleteAbsence(db, 'sara@x.com', 'u1')).toEqual({ id: 'u1', date: '2026-07-24' })
  })
  test('returns null when not found / not owner', async () => {
    expect(await deleteAbsence(fakeDb({ data: null, error: null }), 'sara@x.com', 'u9')).toBeNull()
  })
})

describe('listAbsences', () => {
  test('flattens joined display_name', async () => {
    const db = fakeDb({
      data: [{ id: 'u1', email: 'sara@x.com', date: '2026-07-24', reason: 'travel', allowed_members: { display_name: 'Sara' } }],
      error: null,
    })
    expect(await listAbsences(db, '2026-07-20', '2026-07-24')).toEqual([
      { id: 'u1', email: 'sara@x.com', date: '2026-07-24', reason: 'travel', display_name: 'Sara' },
    ])
  })
  test('throws on db error', async () => {
    await expect(listAbsences(fakeDb({ data: null, error: { message: 'bad' } }), 'a', 'b'))
      .rejects.toThrow('bad')
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement** — `src/lib/absences.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js'

export type Db = SupabaseClient
export type AbsenceRecord = { id: string; email: string; date: string; reason: string }
export type Member = { email: string; display_name: string }

export async function checkAllowed(db: Db, email: string): Promise<Member | null> {
  const { data, error } = await db
    .from('allowed_members')
    .select('email, display_name')
    .eq('email', email.toLowerCase())
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function upsertAbsence(
  db: Db, email: string, date: string, reason: string,
): Promise<{ absence: AbsenceRecord; wasUpdate: boolean }> {
  const { data: existing, error: findError } = await db
    .from('absences').select('id').eq('email', email).eq('date', date).maybeSingle()
  if (findError) throw new Error(findError.message)

  const { data, error } = await db
    .from('absences')
    .upsert(
      { email, date, reason, updated_at: new Date().toISOString() },
      { onConflict: 'email,date' },
    )
    .select('id, email, date, reason')
    .single()
  if (error) throw new Error(error.message)
  return { absence: data as AbsenceRecord, wasUpdate: existing !== null }
}

export async function deleteAbsence(
  db: Db, email: string, id: string,
): Promise<{ id: string; date: string } | null> {
  const { data, error } = await db
    .from('absences').delete().eq('id', id).eq('email', email)
    .select('id, date').maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function listAbsences(
  db: Db, from: string, to: string,
): Promise<Array<AbsenceRecord & { display_name: string }>> {
  const { data, error } = await db
    .from('absences')
    .select('id, email, date, reason, allowed_members(display_name)')
    .gte('date', from)
    .lte('date', to)
    .order('date')
  if (error) throw new Error(error.message)
  type Row = AbsenceRecord & { allowed_members: { display_name: string } | null }
  return ((data ?? []) as unknown as Row[]).map(({ allowed_members, ...rest }) => ({
    ...rest,
    display_name: allowed_members?.display_name ?? rest.email,
  }))
}
```

- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit** — `feat: add absence service layer`

---

### Task 6: Supabase clients, env helper, schema, middleware

**Files:**
- Create: `src/lib/env.ts`, `src/lib/env.test.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`, `src/middleware.ts`, `supabase/schema.sql`, `.env.example`

**Interfaces:**
- Produces:
  - `requireEnv(name: string): string` — throws with clear message if missing
  - `createServerSupabase(): Promise<SupabaseClient>` — anon client bound to request cookies (auth-aware)
  - `createAdminSupabase(): SupabaseClient` — service-role client (bypasses RLS; server only)
  - Middleware redirects unauthenticated users to `/login` (except `/login`, `/auth/*`, `/api/*`).

- [ ] **Step 1: env test** — `src/lib/env.test.ts`:

```ts
import { afterEach, describe, expect, test, vi } from 'vitest'
import { requireEnv } from './env'

describe('requireEnv', () => {
  afterEach(() => vi.unstubAllEnvs())
  test('returns the value when set', () => {
    vi.stubEnv('MY_TEST_VAR', 'abc')
    expect(requireEnv('MY_TEST_VAR')).toBe('abc')
  })
  test('throws with the var name when missing', () => {
    vi.stubEnv('MY_TEST_VAR', '')
    expect(() => requireEnv('MY_TEST_VAR')).toThrow('MY_TEST_VAR')
  })
})
```

- [ ] **Step 2: Run FAIL, implement `src/lib/env.ts`, run PASS:**

```ts
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}
```

- [ ] **Step 3: Supabase clients** — `src/lib/supabase/server.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requireEnv } from '@/lib/env'

export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Called from a Server Component — middleware refreshes sessions instead.
          }
        },
      },
    },
  )
}
```

`src/lib/supabase/admin.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
import { requireEnv } from '@/lib/env'

export function createAdminSupabase() {
  return createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
```

- [ ] **Step 4: Middleware** — `src/middleware.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl
  const isPublic = pathname.startsWith('/login') || pathname.startsWith('/auth') || pathname.startsWith('/api')
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|ico)$).*)'],
}
```

- [ ] **Step 5: Schema** — `supabase/schema.sql` (run once in Supabase SQL editor):

```sql
create table if not exists allowed_members (
  email text primary key check (email = lower(email)),
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists absences (
  id uuid primary key default gen_random_uuid(),
  email text not null references allowed_members (email) on delete cascade,
  date date not null,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email, date)
);

alter table allowed_members enable row level security;
alter table absences enable row level security;

create policy "members readable by authenticated"
  on allowed_members for select to authenticated using (true);

create policy "absences readable by authenticated"
  on absences for select to authenticated using (true);

create policy "insert own absences" on absences for insert to authenticated
  with check (email = lower(auth.jwt() ->> 'email'));

create policy "update own absences" on absences for update to authenticated
  using (email = lower(auth.jwt() ->> 'email'));

create policy "delete own absences" on absences for delete to authenticated
  using (email = lower(auth.jwt() ->> 'email'));
```

- [ ] **Step 6: `.env.example`:**

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
CRON_SECRET=any-long-random-string
```

- [ ] **Step 7: `npm test` all green, `npx tsc --noEmit` clean. Commit** — `feat: add supabase clients, auth middleware, and db schema`

---

### Task 7: Auth API + login page + auth confirm route

**Files:**
- Create: `src/app/api/auth/magic-link/route.ts`, `src/app/auth/confirm/route.ts`, `src/app/login/page.tsx`, `src/app/api/auth/signout/route.ts`

**Interfaces:**
- Consumes: `checkAllowed` (Task 5), `createAdminSupabase`, `createServerSupabase` (Task 6)
- Produces: `POST /api/auth/magic-link` `{ email }` → 200 `{ ok: true }` | 403 `{ error }` | 400; `GET /auth/confirm` completes login; `POST /api/auth/signout`.

- [ ] **Step 1: magic-link route** — `src/app/api/auth/magic-link/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { checkAllowed } from '@/lib/absences'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST(request: Request) {
  let email: unknown
  try {
    ({ email } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  const normalized = email.trim().toLowerCase()

  try {
    const member = await checkAllowed(createAdminSupabase(), normalized)
    if (!member) {
      return NextResponse.json(
        { error: "This email isn't on the team list — ask the admin to add you." },
        { status: 403 },
      )
    }
    const supabase = await createServerSupabase()
    const origin = new URL(request.url).origin
    const { error } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: { emailRedirectTo: `${origin}/auth/confirm` },
    })
    if (error) {
      console.error('signInWithOtp failed', error)
      return NextResponse.json({ error: 'Could not send the link. Try again in a minute.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('magic-link route failed', error)
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}
```

- [ ] **Step 2: confirm route** — `src/app/auth/confirm/route.ts` (handles both PKCE `code` and `token_hash` template styles):

```ts
import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const supabase = await createServerSupabase()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL('/', request.url))
  }
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(new URL('/', request.url))
  }
  return NextResponse.redirect(new URL('/login?error=expired', request.url))
}
```

- [ ] **Step 3: signout route** — `src/app/api/auth/signout/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 })
}
```

- [ ] **Step 4: login page** — `src/app/login/page.tsx` (client component: email input, calls the magic-link route, shows sent/error states; shows "link expired" note when `?error=expired`). Full code in UI style of Task 9; keep it a simple centered card with one input + button and a status line.

```tsx
'use client'

import { FormEvent, Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type Status = { kind: 'idle' | 'sending' | 'sent' | 'error'; message?: string }

function LoginForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const expired = useSearchParams().get('error') === 'expired'

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setStatus({ kind: 'sending' })
    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const body = await response.json()
      if (!response.ok) {
        setStatus({ kind: 'error', message: body.error ?? 'Something went wrong.' })
        return
      }
      setStatus({ kind: 'sent' })
    } catch {
      setStatus({ kind: 'error', message: 'Network error — try again.' })
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Shared Hour</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter your email and we&apos;ll send you a sign-in link.
        </p>
        {expired && (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            That link expired or was already used — request a new one.
          </p>
        )}
        {status.kind === 'sent' ? (
          <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            Check your inbox — your sign-in link is on its way. ✉️
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={status.kind === 'sending'}
              className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {status.kind === 'sending' ? 'Sending…' : 'Send me a link'}
            </button>
            {status.kind === 'error' && (
              <p className="text-sm text-rose-600">{status.message}</p>
            )}
          </form>
        )}
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
```

- [ ] **Step 5: `npx tsc --noEmit` + `npm test` green. Commit** — `feat: add magic-link auth flow with allowlist`

---

### Task 8: Absence + cron API routes

**Files:**
- Create: `src/app/api/absences/route.ts`, `src/app/api/absences/[id]/route.ts`, `src/app/api/cron/daily-reminder/route.ts`
- Create: `src/lib/currentUser.ts`

**Interfaces:**
- Consumes: validation (Task 3), slack (Task 4), absence service (Task 5), supabase clients (Task 6)
- Produces:
  - `getCurrentMember(): Promise<Member | null>` in `src/lib/currentUser.ts` — session user + allowlist row
  - `POST /api/absences` `{ date, reason }` → 200 `{ absence, slackOk }` | 400 | 401
  - `DELETE /api/absences/:id` → 200 `{ ok, slackOk }` | 404 | 401
  - `GET /api/cron/daily-reminder` with `Authorization: Bearer $CRON_SECRET` → 200

- [ ] **Step 1: currentUser helper** — `src/lib/currentUser.ts`:

```ts
import { checkAllowed, type Member } from '@/lib/absences'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'

export async function getCurrentMember(): Promise<Member | null> {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null
  return checkAllowed(createAdminSupabase(), user.email)
}
```

- [ ] **Step 2: absences route** — `src/app/api/absences/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { upsertAbsence } from '@/lib/absences'
import { getCurrentMember } from '@/lib/currentUser'
import { todayInRiyadh } from '@/lib/dates'
import { absenceMarkedMessage, absenceUpdatedMessage, sendSlackMessage } from '@/lib/slack'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { validateAbsenceInput } from '@/lib/validation'

export async function POST(request: Request) {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const result = validateAbsenceInput(body, todayInRiyadh())
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  try {
    const { absence, wasUpdate } = await upsertAbsence(
      createAdminSupabase(), member.email, result.value.date, result.value.reason,
    )
    const message = wasUpdate
      ? absenceUpdatedMessage(member.display_name, absence.date, absence.reason)
      : absenceMarkedMessage(member.display_name, absence.date, absence.reason)
    const slackOk = await sendSlackMessage(message)
    return NextResponse.json({ absence, slackOk })
  } catch (error) {
    console.error('POST /api/absences failed', error)
    return NextResponse.json({ error: 'Could not save — try again.' }, { status: 500 })
  }
}
```

- [ ] **Step 3: delete route** — `src/app/api/absences/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { deleteAbsence } from '@/lib/absences'
import { getCurrentMember } from '@/lib/currentUser'
import { absenceCancelledMessage, sendSlackMessage } from '@/lib/slack'
import { createAdminSupabase } from '@/lib/supabase/admin'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  try {
    const { id } = await params
    const deleted = await deleteAbsence(createAdminSupabase(), member.email, id)
    if (!deleted) return NextResponse.json({ error: 'Absence not found.' }, { status: 404 })
    const slackOk = await sendSlackMessage(absenceCancelledMessage(member.display_name, deleted.date))
    return NextResponse.json({ ok: true, slackOk })
  } catch (error) {
    console.error('DELETE /api/absences/[id] failed', error)
    return NextResponse.json({ error: 'Could not delete — try again.' }, { status: 500 })
  }
}
```

- [ ] **Step 4: cron route** — `src/app/api/cron/daily-reminder/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { listAbsences } from '@/lib/absences'
import { isWeekend, todayInRiyadh } from '@/lib/dates'
import { dailyReminderMessage, sendSlackMessage } from '@/lib/slack'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireEnv } from '@/lib/env'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${requireEnv('CRON_SECRET')}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const today = todayInRiyadh()
  if (isWeekend(today)) return NextResponse.json({ skipped: 'weekend' })

  try {
    const absences = await listAbsences(createAdminSupabase(), today, today)
    const slackOk = await sendSlackMessage(
      dailyReminderMessage(absences.map((a) => ({ name: a.display_name, reason: a.reason }))),
    )
    return NextResponse.json({ ok: true, slackOk, absences: absences.length })
  } catch (error) {
    console.error('daily-reminder failed', error)
    return NextResponse.json({ error: 'Reminder failed.' }, { status: 500 })
  }
}
```

- [ ] **Step 5: `npx tsc --noEmit` + `npm test` green. Commit** — `feat: add absence and cron api routes`

---

### Task 9: Schedule board UI

**Files:**
- Create: `src/app/page.tsx` (server component), `src/app/components/WeekNav.tsx`, `src/app/components/AbsenceForm.tsx`, `src/app/components/AbsenceCard.tsx`
- Modify: `src/app/layout.tsx` (title/metadata), delete create-next-app boilerplate content.

**Interfaces:**
- Consumes: `weekdaysOfWeek`, `todayInRiyadh`, `formatHuman` (Task 2), `listAbsences` (Task 5), `getCurrentMember` (Task 8)
- Produces: `/` page with `?week=N` search param (0 = current week, clamped 0–8).

- [ ] **Step 1: page** — `src/app/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { listAbsences } from '@/lib/absences'
import { getCurrentMember } from '@/lib/currentUser'
import { formatHuman, todayInRiyadh, weekdaysOfWeek } from '@/lib/dates'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { AbsenceCard } from './components/AbsenceCard'
import { AbsenceForm } from './components/AbsenceForm'
import { WeekNav } from './components/WeekNav'

export const dynamic = 'force-dynamic'

const MAX_WEEKS_AHEAD = 8

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const member = await getCurrentMember()
  if (!member) redirect('/login')

  const { week } = await searchParams
  const offset = Math.min(Math.max(Number(week) || 0, 0), MAX_WEEKS_AHEAD)
  const today = todayInRiyadh()
  const days = weekdaysOfWeek(today, offset)
  const absences = await listAbsences(createAdminSupabase(), days[0], days[days.length - 1])

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Shared Hour</h1>
          <p className="text-sm text-slate-500">Signed in as {member.display_name}</p>
        </div>
        <div className="flex items-center gap-3">
          <AbsenceForm today={today} />
          <form action="/api/auth/signout" method="post">
            <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <WeekNav offset={offset} maxWeeks={MAX_WEEKS_AHEAD} />

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {days.map((day) => {
          const dayAbsences = absences.filter((a) => a.date === day)
          const isToday = day === today
          const isPast = day < today
          return (
            <section
              key={day}
              className={`rounded-2xl border p-3 ${
                isToday ? 'border-slate-900 bg-white' : 'border-slate-200 bg-white'
              } ${isPast ? 'opacity-50' : ''}`}
            >
              <h2 className="text-sm font-semibold text-slate-900">
                {formatHuman(day)}
                {isToday && (
                  <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white">today</span>
                )}
              </h2>
              <div className="mt-2 space-y-2">
                {dayAbsences.length === 0 ? (
                  <p className="text-xs text-slate-400">Everyone&apos;s in 🎉</p>
                ) : (
                  dayAbsences.map((a) => (
                    <AbsenceCard
                      key={a.id}
                      absence={a}
                      isOwn={a.email === member.email}
                      isPast={isPast}
                      today={today}
                    />
                  ))
                )}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: WeekNav** — `src/app/components/WeekNav.tsx` (server component, plain links):

```tsx
import Link from 'next/link'

export function WeekNav({ offset, maxWeeks }: { offset: number; maxWeeks: number }) {
  return (
    <nav className="flex items-center gap-2 text-sm">
      <Link
        href={`/?week=${offset - 1}`}
        aria-disabled={offset <= 0}
        className={`rounded-lg border border-slate-300 px-3 py-1.5 ${
          offset <= 0 ? 'pointer-events-none opacity-40' : 'hover:bg-slate-100'
        }`}
      >
        ← Previous
      </Link>
      <span className="px-2 font-medium text-slate-700">
        {offset === 0 ? 'This week' : offset === 1 ? 'Next week' : `In ${offset} weeks`}
      </span>
      <Link
        href={`/?week=${offset + 1}`}
        aria-disabled={offset >= maxWeeks}
        className={`rounded-lg border border-slate-300 px-3 py-1.5 ${
          offset >= maxWeeks ? 'pointer-events-none opacity-40' : 'hover:bg-slate-100'
        }`}
      >
        Next →
      </Link>
    </nav>
  )
}
```

- [ ] **Step 3: AbsenceForm** — `src/app/components/AbsenceForm.tsx` (client): dialog-style panel toggled by an "I'll be away…" button. Date input `min={today}`, textarea for reason, POST to `/api/absences`, `router.refresh()` on success, warning toast text when `slackOk === false`.

```tsx
'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

type Status = { kind: 'idle' | 'saving' | 'error' | 'slack-warn'; message?: string }

export function AbsenceForm({ today, initialDate, initialReason, small }: {
  today: string
  initialDate?: string
  initialReason?: string
  small?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(initialDate ?? '')
  const [reason, setReason] = useState(initialReason ?? '')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const router = useRouter()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setStatus({ kind: 'saving' })
    try {
      const response = await fetch('/api/absences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, reason }),
      })
      const body = await response.json()
      if (!response.ok) {
        setStatus({ kind: 'error', message: body.error ?? 'Something went wrong.' })
        return
      }
      if (!body.slackOk) {
        setStatus({ kind: 'slack-warn', message: 'Saved, but the Slack notification failed.' })
      } else {
        setStatus({ kind: 'idle' })
        setOpen(false)
        if (!initialDate) { setDate(''); setReason('') }
      }
      router.refresh()
    } catch {
      setStatus({ kind: 'error', message: 'Network error — try again.' })
    }
  }

  if (!open) {
    return (
      <div className="flex items-center gap-2">
        {status.kind === 'slack-warn' && (
          <span className="text-xs text-amber-600">{status.message}</span>
        )}
        <button
          onClick={() => setOpen(true)}
          className={
            small
              ? 'text-xs text-slate-500 underline hover:text-slate-900'
              : 'rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700'
          }
        >
          {small ? 'Edit' : "I'll be away…"}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-xl border border-slate-300 bg-white p-3 shadow-sm">
      <input
        type="date"
        required
        min={today}
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      />
      <textarea
        required
        maxLength={500}
        placeholder="Reason (the team will see this)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="min-h-16 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      />
      {status.kind === 'error' && <p className="text-xs text-rose-600">{status.message}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={status.kind === 'saving'}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {status.kind === 'saving' ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setStatus({ kind: 'idle' }) }}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 4: AbsenceCard** — `src/app/components/AbsenceCard.tsx` (client): shows name + reason; own upcoming absences get Edit (reuses `AbsenceForm` with `initialDate`/`initialReason` + `small`) and Remove (DELETE + `router.refresh()`, confirm()-guarded):

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AbsenceForm } from './AbsenceForm'

type Absence = { id: string; email: string; date: string; reason: string; display_name: string }

export function AbsenceCard({ absence, isOwn, isPast, today }: {
  absence: Absence
  isOwn: boolean
  isPast: boolean
  today: string
}) {
  const [status, setStatus] = useState<'idle' | 'deleting' | 'error'>('idle')
  const router = useRouter()

  async function handleRemove() {
    if (!window.confirm(`Remove your absence on ${absence.date}?`)) return
    setStatus('deleting')
    try {
      const response = await fetch(`/api/absences/${absence.id}`, { method: 'DELETE' })
      if (!response.ok) { setStatus('error'); return }
      router.refresh()
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className={`rounded-lg p-2 text-sm ${isOwn ? 'bg-slate-100' : 'bg-rose-50'}`}>
      <p className="font-medium text-slate-900">{absence.display_name}</p>
      <p className="text-xs text-slate-600">{absence.reason}</p>
      {isOwn && !isPast && (
        <div className="mt-1 flex items-center gap-3">
          <AbsenceForm today={today} initialDate={absence.date} initialReason={absence.reason} small />
          <button
            onClick={handleRemove}
            disabled={status === 'deleting'}
            className="text-xs text-rose-500 underline hover:text-rose-700 disabled:opacity-50"
          >
            {status === 'deleting' ? 'Removing…' : 'Remove'}
          </button>
          {status === 'error' && <span className="text-xs text-rose-600">Failed</span>}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: layout metadata** — in `src/app/layout.tsx` set `export const metadata = { title: 'Shared Hour', description: 'Team shared-hour availability' }`. Remove boilerplate from globals if create-next-app added demo styles beyond Tailwind directives.

- [ ] **Step 6: `npx tsc --noEmit`, `npm test`, `npm run build` all green. Commit** — `feat: add schedule board ui with absence form`

---

### Task 10: Vercel cron config + README + final verification

**Files:**
- Create: `vercel.json`, `README.md`

- [ ] **Step 1: `vercel.json`** (06:00 UTC = 09:00 Asia/Riyadh, Mon–Fri):

```json
{
  "crons": [
    { "path": "/api/cron/daily-reminder", "schedule": "0 6 * * 1-5" }
  ]
}
```

- [ ] **Step 2: README** with setup instructions: create Supabase project → run `supabase/schema.sql` in SQL editor → add team rows to `allowed_members` → enable Email auth provider → add site URL + `/auth/confirm` to Auth redirect URLs → create Slack incoming webhook → set the 5 env vars locally (`.env.local`) and on Vercel → deploy → `CRON_SECRET` env makes Vercel sign cron requests. Include `npm run dev`, `npm test`, `npm run test:coverage` usage.

- [ ] **Step 3: Final verification:** `npm run test:coverage` (≥80% on src/lib), `npx tsc --noEmit`, `npm run build`, `npx eslint .`. All green.

- [ ] **Step 4: Commit** — `chore: add vercel cron config and setup readme`
