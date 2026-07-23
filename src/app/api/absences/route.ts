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
