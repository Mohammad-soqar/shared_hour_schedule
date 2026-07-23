import { redirect } from 'next/navigation'
import { listAbsences, listRecentActivity, type ActivityRecord } from '@/lib/absences'
import { getCurrentMember } from '@/lib/currentUser'
import { SHARED_HOUR_START } from '@/lib/config'
import {
  formatHuman, isWeekend, lastSelectableDate,
  MAX_WEEKS_AHEAD, todayInRiyadh, weekdaysOfWeek,
} from '@/lib/dates'
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

function toSlackEvent(record: ActivityRecord, today: string): SlackEvent {
  const wasEdited =
    new Date(record.updated_at).getTime() - new Date(record.created_at).getTime() > EDIT_GAP_MS
  const text = wasEdited
    ? `✏️ ${record.display_name}'s absence on ${formatHuman(record.date)} updated — ${record.reason}`
    : `🚫 ${record.display_name} won't be available ${formatHuman(record.date)} — ${record.reason}`
  const at = riyadhTimeParts(record.updated_at)
  const time = at.date === today ? `TODAY ${at.hhmm}` : `${at.weekday} ${at.hhmm}`
  return { text, time }
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
): PinnedPost {
  const weekend = isWeekend(today)
  const rollCallDate = weekend ? nextMonday(today) : today
  const out = absencesOn(rollCallDate)
  const dayWord = weekend ? 'Monday' : 'today'
  const text = out.length === 0
    ? `⏰ Shared hour ${dayWord} — everyone's in!`
    : `⏰ Shared hour ${dayWord} — out: ${out.map((a) => `${a.display_name.split(' ')[0]} (${a.reason})`).join(', ')}`
  if (weekend) {
    return { label: "PREVIEW · MONDAY'S 09:00 POST", text: `No shared hour today — it's the weekend. Monday's post: ${text}` }
  }
  const riyadhHour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Riyadh', hour: '2-digit', hourCycle: 'h23',
  }).format(new Date()))
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
  const days = weekdaysOfWeek(today, offset)
  const rangeStart = days[0] < today ? days[0] : today
  const rangeEnd = lastSelectableDate(today)

  const db = createAdminSupabase()
  const [absences, activity] = await Promise.all([
    listAbsences(db, rangeStart, rangeEnd),
    listRecentActivity(db, FEED_LIMIT),
  ])

  const events = activity.map((record) => toSlackEvent(record, today))
  const pinned = buildPinned(today, (date) => absences.filter((a) => a.date === date))

  return (
    <BoardClient
      member={member}
      today={today}
      offset={offset}
      maxWeeks={MAX_WEEKS_AHEAD}
      days={days}
      absences={absences}
      events={events}
      pinned={pinned}
      hourStart={SHARED_HOUR_START}
      slackConfigured={Boolean(process.env.SLACK_WEBHOOK_URL)}
    />
  )
}
