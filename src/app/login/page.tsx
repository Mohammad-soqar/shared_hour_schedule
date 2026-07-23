'use client'

import { FormEvent, Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type Status = { kind: 'idle' | 'sending' | 'sent' | 'error'; message?: string }

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

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Shared Hour</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter your email and we&apos;ll send you a sign-in link.
        </p>
        {expired && (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            That link expired or was already used — request a new one.
          </p>
        )}
        {status.kind === 'sent' ? (
          <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            Check your inbox — your sign-in link is on its way. ✉️
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={status.kind === 'sending'}
              className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {status.kind === 'sending' ? 'Sending…' : 'Send me a link'}
            </button>
            {status.kind === 'error' && (
              <p className="text-sm text-rose-600">{status.message}</p>
            )}
          </form>
        )}
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
