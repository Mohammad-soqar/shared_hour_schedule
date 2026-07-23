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
