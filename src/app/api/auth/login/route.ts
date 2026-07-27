import { NextResponse } from 'next/server'
import { checkAllowed } from '@/lib/absences'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/
const PIN_PATTERN = /^\d{6}$/

export async function POST(request: Request) {
  let email: unknown
  let pin: unknown
  try {
    ({ email, pin } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (typeof pin !== 'string' || !PIN_PATTERN.test(pin)) {
    return NextResponse.json({ error: 'Your PIN is 6 digits.' }, { status: 400 })
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
    const { error } = await supabase.auth.signInWithPassword({ email: normalized, password: pin })
    if (error) {
      return NextResponse.json({ error: 'Wrong email or PIN.' }, { status: 401 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('login failed', error)
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}
