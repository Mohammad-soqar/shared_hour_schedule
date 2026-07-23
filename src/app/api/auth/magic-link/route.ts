import { NextResponse } from 'next/server'
import { checkAllowed } from '@/lib/absences'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'

export async function POST(request: Request) {
  let email: unknown
  try {
    ({ email } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  const normalized = email.trim().toLowerCase()

  try {
    const member = await checkAllowed(createAdminSupabase(), normalized)
    if (!member) {
      return NextResponse.json(
        { error: "This email isn't on the team list — ask the admin to add you." },
        { status: 403 },
      )
    }
    const supabase = await createServerSupabase()
    const origin = new URL(request.url).origin
    const { error } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: { emailRedirectTo: `${origin}/auth/confirm` },
    })
    if (error) {
      console.error('signInWithOtp failed', error)
      return NextResponse.json({ error: 'Could not send the link. Try again in a minute.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('magic-link route failed', error)
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}
