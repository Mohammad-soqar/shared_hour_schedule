import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/currentUser'
import { sendSlackMessage, signupCancelledMessage } from '@/lib/slack'
import { deleteSignup } from '@/lib/signups'
import { createAdminSupabase } from '@/lib/supabase/admin'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  try {
    const { id } = await params
    const deleted = await deleteSignup(createAdminSupabase(), member.email, id)
    if (!deleted) return NextResponse.json({ error: 'Sign-up not found.' }, { status: 404 })
    const slackOk = await sendSlackMessage(signupCancelledMessage(member.display_name, deleted.date))
    return NextResponse.json({ ok: true, slackOk })
  } catch (error) {
    console.error('DELETE /api/signups/[id] failed', error)
    return NextResponse.json({ error: 'Could not delete — try again.' }, { status: 500 })
  }
}
