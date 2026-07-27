import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

const PIN_PATTERN = /^\d{6}$/

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  let pin: unknown
  try {
    ({ pin } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  if (typeof pin !== 'string' || !PIN_PATTERN.test(pin)) {
    return NextResponse.json({ error: 'Your new PIN must be exactly 6 digits.' }, { status: 400 })
  }

  const { error } = await supabase.auth.updateUser({ password: pin })
  if (error) {
    console.error('pin change failed', error)
    return NextResponse.json({ error: 'Could not change the PIN — try again.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
