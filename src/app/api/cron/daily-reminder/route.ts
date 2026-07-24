import { NextResponse } from 'next/server'
import { listAbsences } from '@/lib/absences'
import { isWeekend, todayInRiyadh } from '@/lib/dates'
import { dailyReminderMessage, sendSlackMessage, weekendReminderMessage } from '@/lib/slack'
import { listSignups } from '@/lib/signups'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireEnv } from '@/lib/env'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${requireEnv('CRON_SECRET')}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const today = todayInRiyadh()

  try {
    const db = createAdminSupabase()
    if (isWeekend(today)) {
      const signups = await listSignups(db, today, today)
      if (signups.length === 0) {
        return NextResponse.json({ ok: true, skipped: 'weekend, nobody signed up' })
      }
      const slackOk = await sendSlackMessage(
        weekendReminderMessage(signups.map((s) => ({ name: s.display_name, note: s.note }))),
      )
      return NextResponse.json({ ok: true, slackOk, signups: signups.length })
    }

    const absences = await listAbsences(db, today, today)
    const slackOk = await sendSlackMessage(
      dailyReminderMessage(absences.map((a) => ({ name: a.display_name, reason: a.reason }))),
    )
    return NextResponse.json({ ok: true, slackOk, absences: absences.length })
  } catch (error) {
    console.error('daily-reminder failed', error)
    return NextResponse.json({ error: 'Reminder failed.' }, { status: 500 })
  }
}
