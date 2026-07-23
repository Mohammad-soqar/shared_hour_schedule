'use client'

import { FormEvent, Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { hourRangeLabel } from '@/lib/config'
import { ClockMark } from '../components/ClockMark'

type Status = { kind: 'idle' | 'sending' | 'sent' | 'error'; message?: string }

const STEPS = [
  'Pick the day you’ll miss, leave a short note',
  'The board and #shared-hour update instantly',
  '09:00 every weekday, Slack gets the roll call',
]

function LoginForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const expired = useSearchParams().get('error') === 'expired'

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setStatus({ kind: 'sending' })
    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const body = await response.json()
      if (!response.ok) {
        setStatus({ kind: 'error', message: body.error ?? 'Something went wrong.' })
        return
      }
      setStatus({ kind: 'sent' })
    } catch {
      setStatus({ kind: 'error', message: 'Network error — try again.' })
    }
  }

  const firstName = email.split('@')[0].split(/[._-]/)[0] || 'there'

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
            — every weekday, {hourRangeLabel()} Riyadh time. weekends are yours 🎉
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.65, color: '#3E5B55', margin: '18px 0 0', maxWidth: 420 }}>
            Going to miss it? Say so here, and the rest is automatic — the board updates, the
            team&apos;s Slack hears about it, and every weekday at 09:00 (Riyadh time) the roll
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
          {status.kind === 'sent' ? (
            <>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.16em',
                textTransform: 'uppercase', color: 'var(--pine)',
              }}>Magic link sent</div>
              <div className="font-serif-display" style={{ fontSize: 28, lineHeight: 1.1, marginTop: 8 }}>
                Check your <em style={{ fontStyle: 'italic', color: 'var(--pine)' }}>inbox.</em>
              </div>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--sage)', margin: '8px 0 0' }}>
                We wrote to <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{email}</strong>.
                The link works once — open it on this device.
              </p>
              <div style={{
                position: 'relative', border: '1.5px solid #C4D8D1', borderRadius: 6,
                background: '#F5FAF7', marginTop: 20, padding: '18px 16px 16px',
                boxShadow: '0 8px 22px rgba(9,56,50,0.10)',
              }}>
                <div style={{
                  position: 'absolute', top: 10, right: 10, width: 34, height: 40,
                  border: '1.5px dashed #A9C4BB', borderRadius: 2, display: 'grid', placeItems: 'center',
                }}>
                  <ClockMark size={20} stroke="#5F7B74" showDot={false} />
                </div>
                <div style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--fog)', textTransform: 'uppercase' }}>
                  From · Shared Hour
                </div>
                <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#3E5B55', textTransform: 'uppercase', marginTop: 3 }}>
                  Subject · your sign-in link
                </div>
                <p className="font-hand" style={{
                  fontSize: 21, lineHeight: 1.3, color: '#1F4740', margin: '14px 0 0', maxWidth: 250,
                }}>
                  Hi {firstName} — your key to the hour. See you there!
                </p>
              </div>
              <button
                onClick={() => setStatus({ kind: 'idle' })}
                style={{
                  marginTop: 16, background: 'transparent', border: 'none', padding: '6px 0',
                  fontSize: 13, color: 'var(--sage)', cursor: 'pointer',
                }}
              >
                ← Use a different email
              </button>
            </>
          ) : (
            <>
              <div className="font-serif-display" style={{ fontSize: 28, lineHeight: 1.1 }}>Sign in</div>
              <p style={{ fontSize: 13.5, color: 'var(--sage)', margin: '7px 0 0' }}>
                No passwords — a magic link lands in your inbox.
              </p>
              {expired && (
                <p style={{
                  fontSize: 13, lineHeight: 1.5, color: '#8a5a00', background: '#FDF3DD',
                  borderRadius: 8, padding: '10px 12px', margin: '14px 0 0',
                }}>
                  That link expired or was already used — request a new one.
                </p>
              )}
              <form onSubmit={handleSubmit}>
                <label htmlFor="sh-email" style={{
                  display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
                  textTransform: 'uppercase', color: 'var(--sage)', margin: '24px 0 0',
                }}>
                  Work email
                </label>
                <input
                  id="sh-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@team.dev"
                  style={{
                    marginTop: 8, display: 'block', width: '100%', height: 44, borderRadius: 10,
                    border: '1.5px solid #C4D8D1', background: '#F2F7F4', padding: '0 14px',
                    fontSize: 15, outline: 'none',
                  }}
                />
                {status.kind === 'error' && (
                  <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--alert)', margin: '10px 0 0' }}>
                    {status.message}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={status.kind === 'sending'}
                  style={{
                    marginTop: 18, width: '100%', height: 46, display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'center', gap: 8, border: 'none',
                    borderRadius: 9999, background: 'var(--pine)', color: 'var(--paper)',
                    fontSize: 15, fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 2px 0 rgba(0,53,53,0.3)',
                    opacity: status.kind === 'sending' ? 0.6 : 1,
                  }}
                >
                  {status.kind === 'sending' ? 'Sending…' : 'Email me a sign-in link →'}
                </button>
              </form>
            </>
          )}
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
