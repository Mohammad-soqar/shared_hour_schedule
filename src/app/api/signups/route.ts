import { NextResponse } from 'next/server'
import { checkAllowed } from '@/lib/absences'
import { getCurrentMember } from '@/lib/currentUser'
import { todayInRiyadh } from '@/lib/dates'
import { sendSlackMessage, signupMessage } from '@/lib/slack'
import { upsertSignup } from '@/lib/signups'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { validateSignupInput } from '@/lib/validation'

export async function POST(request: Request) {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const result = validateSignupInput(body, todayInRiyadh())
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  try {
    const db = createAdminSupabase()
    let invitedName: string | null = null
    if (result.value.invitedEmail) {
      if (result.value.invitedEmail === member.email) {
        return NextResponse.json({ error: "You're already in — no need to invite yourself." }, { status: 400 })
      }
      const invited = await checkAllowed(db, result.value.invitedEmail)
      if (!invited) {
        return NextResponse.json({ error: "That teammate isn't on the team list." }, { status: 400 })
      }
      invitedName = invited.display_name
    }

    const { signup } = await upsertSignup(
      db, member.email, result.value.date, result.value.note, result.value.invitedEmail,
    )
    const slackOk = await sendSlackMessage(
      signupMessage(member.display_name, signup.date, signup.note, invitedName),
    )
    return NextResponse.json({ signup, slackOk })
  } catch (error) {
    console.error('POST /api/signups failed', error)
    return NextResponse.json({ error: 'Could not save — try again.' }, { status: 500 })
  }
}
