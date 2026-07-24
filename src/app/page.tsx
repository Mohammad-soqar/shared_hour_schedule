import { redirect } from 'next/navigation'
import { listAbsences, listRecentActivity, type ActivityRecord } from '@/lib/absences'
import { getCurrentMember } from '@/lib/currentUser'
import { SHARED_HOUR_START } from '@/lib/config'
import {
  daysOfWeek, formatHuman, isWeekend, lastSelectableDate,
  MAX_WEEKS_AHEAD, todayInRiyadh,
} from '@/lib/dates'
import {
  listMembers, listRecentSignupActivity, listSignups, type SignupActivityRecord,
} from '@/lib/signups'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { BoardClient } from './components/BoardClient'
import type { PinnedPost, SlackEvent } from './components/types'

export const dynamic = 'force-dynamic'

const FEED_LIMIT = 12
// Upserts touch updated_at even on insert, so only a real gap means "edited".
const EDIT_GAP_MS = 5000

function riyadhTimeParts(isoTimestamp: string): { date: string; hhmm: string; weekday: string } {
  const at = new Date(isoTimestamp)
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(at)
  const hhmm = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(at)
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Riyadh', weekday: 'short',
  }).format(at).toUpperCase()
  return { date, hhmm, weekday }
}

function timeLabel(isoTimestamp: string, today: string): string {
  const at = riyadhTimeParts(isoTimestamp)
  return at.date === today ? `TODAY ${at.hhmm}` : `${at.weekday} ${at.hhmm}`
}

function wasEdited(created: string, updated: string): boolean {
  return new Date(updated).getTime() - new Date(created).getTime() > EDIT_GAP_MS
}

function absenceEvent(record: ActivityRecord, today: string): SlackEvent & { at: string } {
  const text = wasEdited(record.created_at, record.updated_at)
    ? `✏️ ${record.display_name}'s absence on ${formatHuman(record.date)} updated — ${record.reason}`
    : `🚫 ${record.display_name} won't be available ${formatHuman(record.date)} — ${record.reason}`
  return { text, time: timeLabel(record.updated_at, today), at: record.updated_at }
}

function signupEvent(record: SignupActivityRecord, today: string): SlackEvent & { at: string } {
  let text = wasEdited(record.created_at, record.updated_at)
    ? `✏️ ${record.display_name}'s weekend sign-up on ${formatHuman(record.date)} updated`
    : `🙋 ${record.display_name} is in for the shared hour ${formatHuman(record.date)}`
  if (record.note) text += ` — ${record.note}`
  if (record.invited_name) text += ` · asking ${record.invited_name} to join`
  return { text, time: timeLabel(record.updated_at, today), at: record.updated_at }
}

function nextMonday(today: string): string {
  const d = new Date(`${today}T12:00:00Z`)
  do {
    d.setUTCDate(d.getUTCDate() + 1)
  } while (d.getUTCDay() !== 1)
  return d.toISOString().slice(0, 10)
}

function buildPinned(
  today: string,
  absencesOn: (date: string) => Array<{ display_name: string; reason: string }>,
  signupsOn: (date: string) => Array<{ display_name: string; note: string }>,
): PinnedPost {
  const riyadhHour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Riyadh', hour: '2-digit', hourCycle: 'h23',
  }).format(new Date()))

  if (isWeekend(today)) {
    const crew = signupsOn(today)
    if (crew.length > 0) {
      const who = crew.map((s) => (s.note ? `${s.display_name.split(' ')[0]} (${s.note})` : s.display_name.split(' ')[0])).join(', ')
      return {
        label: riyadhHour < 9 ? "PREVIEW · TODAY'S 09:00 POST" : "PINNED · TODAY'S 09:00 POST",
        text: `⏰ Weekend shared hour today — in: ${who}`,
      }
    }
    const out = absencesOn(nextMonday(today))
    const monday = out.length === 0
      ? "⏰ Shared hour Monday — everyone's in!"
      : `⏰ Shared hour Monday — out: ${out.map((a) => `${a.display_name.split(' ')[0]} (${a.reason})`).join(', ')}`
    return {
      label: "PREVIEW · MONDAY'S 09:00 POST",
      text: `Weekend's quiet — nobody signed up. ${monday}`,
    }
  }

  const out = absencesOn(today)
  const text = out.length === 0
    ? "⏰ Shared hour today — everyone's in!"
    : `⏰ Shared hour today — out: ${out.map((a) => `${a.display_name.split(' ')[0]} (${a.reason})`).join(', ')}`
  return {
    label: riyadhHour < 9 ? "PREVIEW · TODAY'S 09:00 POST" : "PINNED · TODAY'S 09:00 POST",
    text,
  }
}

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
  const days = daysOfWeek(today, offset)
  const rangeStart = days[0] < today ? days[0] : today
  const rangeEnd = lastSelectableDate(today)

  const db = createAdminSupabase()
  const [absences, signups, members, absenceActivity, signupActivity] = await Promise.all([
    listAbsences(db, rangeStart, rangeEnd),
    listSignups(db, rangeStart, rangeEnd),
    listMembers(db),
    listRecentActivity(db, FEED_LIMIT),
    listRecentSignupActivity(db, FEED_LIMIT),
  ])

  const events = [
    ...absenceActivity.map((record) => absenceEvent(record, today)),
    ...signupActivity.map((record) => signupEvent(record, today)),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, FEED_LIMIT)
    .map(({ text, time }) => ({ text, time }))

  const pinned = buildPinned(
    today,
    (date) => absences.filter((a) => a.date === date),
    (date) => signups.filter((s) => s.date === date),
  )

  return (
    <BoardClient
      member={member}
      today={today}
      offset={offset}
      maxWeeks={MAX_WEEKS_AHEAD}
      days={days}
      absences={absences}
      signups={signups}
      members={members}
      events={events}
      pinned={pinned}
      hourStart={SHARED_HOUR_START}
      slackConfigured={Boolean(process.env.SLACK_WEBHOOK_URL)}
    />
  )
}
