'use client'

import { FormEvent, Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { hourRangeLabel } from '@/lib/config'
import { ClockMark } from '../components/ClockMark'

type Status = { kind: 'idle' | 'signing' | 'error'; message?: string }

const STEPS = [
  'Pick the day you’ll miss, leave a short note',
  'The board and #shared-hour update instantly',
  '09:00 every day, Slack gets the roll call',
]

function LoginForm() {
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const expired = useSearchParams().get('error') === 'expired'
  const router = useRouter()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setStatus({ kind: 'signing' })
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin }),
      })
      const body = await response.json()
      if (!response.ok) {
        setStatus({ kind: 'error', message: body.error ?? 'Something went wrong.' })
        return
      }
      router.push('/')
      router.refresh()
    } catch {
      setStatus({ kind: 'error', message: 'Network error — try again.' })
    }
  }

  const inputStyle: React.CSSProperties = {
    marginTop: 8, display: 'block', width: '100%', height: 44, borderRadius: 10,
    border: '1.5px solid #C4D8D1', background: '#F2F7F4', padding: '0 14px',
    fontSize: 15, outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
    textTransform: 'uppercase', color: 'var(--sage)', margin: '20px 0 0',
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '36px 24px' }}>
      <div style={{
        width: '100%', maxWidth: 1000, display: 'flex', flexWrap: 'wrap',
        gap: 'clamp(40px,7vw,88px)', alignItems: 'center', justifyContent: 'center',
        animation: 'shRise 400ms cubic-bezier(0,0,0.2,1) both',
      }}>
        <div style={{ flex: '1 1 380px', maxWidth: 520 }}>
          <ClockMark size={76} strokeWidth={2.6} />
          <h1 className="font-serif-display" style={{
            fontWeight: 400, fontSize: 'clamp(42px,6vw,60px)', lineHeight: 1.02,
            letterSpacing: '-0.01em', margin: '26px 0 0',
          }}>
            One hour.<br />
            <em style={{ fontStyle: 'italic', color: 'var(--pine)' }}>All of us.</em>
          </h1>
          <p className="font-hand" style={{
            fontSize: 22, lineHeight: 1.3, color: 'var(--sage)', margin: '14px 0 0', transform: 'rotate(-1deg)',
          }}>
            — every weekday, {hourRangeLabel()} Riyadh time. weekends are opt-in 🙋
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.65, color: '#3E5B55', margin: '18px 0 0', maxWidth: 420 }}>
            Going to miss it? Say so here, and the rest is automatic — the board updates, the
            team&apos;s Slack hears about it, and every morning at 09:00 (Riyadh time) the roll
            call goes out.
          </p>
          <div style={{ marginTop: 26, maxWidth: 420 }}>
            {STEPS.map((step, i) => (
              <div key={step} style={{
                borderTop: '1px dashed #BED3CC',
                borderBottom: i === STEPS.length - 1 ? '1px dashed #BED3CC' : undefined,
                padding: '11px 0', display: 'grid', gridTemplateColumns: '42px 1fr',
                gap: 8, alignItems: 'baseline',
              }}>
                <span className="font-serif-display" style={{ fontSize: 19, color: 'var(--pine)' }}>{i + 1}.</span>
                <span style={{ fontSize: 14 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          flex: '1 1 340px', maxWidth: 430, background: 'var(--paper)',
          border: '1px solid var(--hairline)', borderRadius: 16,
          boxShadow: '0 2px 6px rgba(9,56,50,0.06),0 24px 60px rgba(9,56,50,0.14)', padding: 30,
        }}>
          <div className="font-serif-display" style={{ fontSize: 28, lineHeight: 1.1 }}>Sign in</div>
          <p style={{ fontSize: 13.5, color: 'var(--sage)', margin: '7px 0 0' }}>
            Your email and your 6-digit PIN. Forgot it? Ask the admin for a new one.
          </p>
          {expired && (
            <p style={{
              fontSize: 13, lineHeight: 1.5, color: '#8a5a00', background: '#FDF3DD',
              borderRadius: 8, padding: '10px 12px', margin: '14px 0 0',
            }}>
              That link expired or was already used — sign in with your PIN instead.
            </p>
          )}
          <form onSubmit={handleSubmit}>
            <label htmlFor="sh-email" style={labelStyle}>Work email</label>
            <input
              id="sh-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@team.dev"
              style={inputStyle}
            />
            <label htmlFor="sh-pin" style={labelStyle}>PIN</label>
            <input
              id="sh-pin"
              type="password"
              required
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              style={{ ...inputStyle, letterSpacing: '0.4em', fontVariantNumeric: 'tabular-nums' }}
            />
            {status.kind === 'error' && (
              <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--alert)', margin: '10px 0 0' }}>
                {status.message}
              </p>
            )}
            <button
              type="submit"
              disabled={status.kind === 'signing'}
              style={{
                marginTop: 20, width: '100%', height: 46, display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', gap: 8, border: 'none',
                borderRadius: 9999, background: 'var(--pine)', color: 'var(--paper)',
                fontSize: 15, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 2px 0 rgba(0,53,53,0.3)',
                opacity: status.kind === 'signing' ? 0.6 : 1,
              }}
            >
              {status.kind === 'signing' ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
          <p style={{ fontSize: 11.5, color: 'var(--fog)', margin: '14px 0 0' }}>
            You can change your PIN any time from the board.
          </p>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
