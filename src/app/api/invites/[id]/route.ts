import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/currentUser'
import { isPastDate, todayInRiyadh } from '@/lib/dates'
import { inviteAcceptedMessage, inviteDeclinedMessage, sendSlackMessage } from '@/lib/slack'
import { respondToInvite, upsertSignup } from '@/lib/signups'
import { createAdminSupabase } from '@/lib/supabase/admin'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  let action: unknown
  try {
    ({ action } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  if (action !== 'accept' && action !== 'decline') {
    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
  }

  try {
    const db = createAdminSupabase()
    const { id } = await params
    const invite = await respondToInvite(
      db, member.email, id, action === 'accept' ? 'accepted' : 'declined',
    )
    if (!invite) return NextResponse.json({ error: 'Invite not found or already answered.' }, { status: 404 })

    const today = todayInRiyadh()
    if (isPastDate(invite.date, today)) {
      return NextResponse.json({ error: 'That weekend already passed.' }, { status: 400 })
    }

    const person = { name: member.display_name, slackId: member.slack_id ?? null }
    const inviter = { name: invite.inviter_name, slackId: invite.inviter_slack_id }
    let slackOk: boolean
    if (action === 'accept') {
      await upsertSignup(db, member.email, invite.date, '', [])
      slackOk = await sendSlackMessage(inviteAcceptedMessage(person, inviter, invite.date))
    } else {
      slackOk = await sendSlackMessage(inviteDeclinedMessage(person, invite.date))
    }
    return NextResponse.json({ ok: true, slackOk })
  } catch (error) {
    console.error('POST /api/invites/[id] failed', error)
    return NextResponse.json({ error: 'Could not save your answer — try again.' }, { status: 500 })
  }
}
