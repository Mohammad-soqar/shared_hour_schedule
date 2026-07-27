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
    // Prefer the configured public URL: behind proxies the request origin can
    // lie, and Supabase silently falls back to its Site URL on a mismatch.
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin
    const { error } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: { emailRedirectTo: `${origin}/auth/confirm` },
    })
    if (error) {
      console.error('signInWithOtp failed', error)
      if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
        return NextResponse.json(
          { error: "Email limit reached — Supabase's built-in mailer only sends a couple of emails per hour (on every plan). Try again in about an hour, or ask the admin to connect custom SMTP." },
          { status: 429 },
        )
      }
      return NextResponse.json({ error: 'Could not send the link. Try again in a minute.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('magic-link route failed', error)
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}
