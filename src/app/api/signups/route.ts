import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/currentUser'
import { todayInRiyadh } from '@/lib/dates'
import { sendSlackMessage, signupMessage, type Person } from '@/lib/slack'
import { listMembers, upsertSignup } from '@/lib/signups'
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
    const roster = await listMembers(db)
    const invited: Person[] = []
    for (const email of result.value.invitedEmails) {
      if (email === member.email) {
        return NextResponse.json({ error: "You're already in — no need to invite yourself." }, { status: 400 })
      }
      const teammate = roster.find((m) => m.email === email)
      if (!teammate) {
        return NextResponse.json({ error: "One of those teammates isn't on the team list." }, { status: 400 })
      }
      invited.push({ name: teammate.display_name, slackId: teammate.slack_id ?? null })
    }

    const { signup } = await upsertSignup(
      db, member.email, result.value.date, result.value.note, result.value.invitedEmails,
    )
    const slackOk = await sendSlackMessage(
      signupMessage(
        { name: member.display_name, slackId: member.slack_id ?? null },
        signup.date, signup.note, invited,
      ),
    )
    return NextResponse.json({ signup, slackOk })
  } catch (error) {
    console.error('POST /api/signups failed', error)
    return NextResponse.json({ error: 'Could not save — try again.' }, { status: 500 })
  }
}
