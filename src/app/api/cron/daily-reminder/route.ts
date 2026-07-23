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
