'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

type Status = { kind: 'idle' | 'saving' | 'error' | 'slack-warn'; message?: string }

interface AbsenceFormProps {
  today: string
  maxDate?: string
  initialDate?: string
  initialReason?: string
  small?: boolean
}

export function AbsenceForm({ today, maxDate, initialDate, initialReason, small }: AbsenceFormProps) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(initialDate ?? '')
  const [reason, setReason] = useState(initialReason ?? '')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const router = useRouter()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setStatus({ kind: 'saving' })
    try {
      const response = await fetch('/api/absences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, reason }),
      })
      const body = await response.json()
      if (!response.ok) {
        setStatus({ kind: 'error', message: body.error ?? 'Something went wrong.' })
        return
      }
      if (!body.slackOk) {
        setStatus({ kind: 'slack-warn', message: 'Saved, but the Slack notification failed.' })
        setOpen(false)
      } else {
        setStatus({ kind: 'idle' })
        setOpen(false)
        if (!initialDate) {
          setDate('')
          setReason('')
        }
      }
      router.refresh()
    } catch {
      setStatus({ kind: 'error', message: 'Network error — try again.' })
    }
  }

  if (!open) {
    return (
      <div className="flex items-center gap-2">
        {status.kind === 'slack-warn' && (
          <span className="text-xs text-amber-600">{status.message}</span>
        )}
        <button
          onClick={() => setOpen(true)}
          className={
            small
              ? 'text-xs text-slate-500 underline hover:text-slate-900'
              : 'rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700'
          }
        >
          {small ? 'Edit' : "I'll be away…"}
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-xl border border-slate-300 bg-white p-3 shadow-sm"
    >
      <input
        type="date"
        required
        min={today}
        max={maxDate}
        value={date}
        onChange={(e) => setDate(e.target.value)}
        // Editing only changes the reason: the API upserts on (email, date), so a
        // changed date would create a second absence instead of moving this one.
        disabled={Boolean(initialDate)}
        className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
      />
      <textarea
        required
        maxLength={500}
        placeholder="Reason (the team will see this)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="min-h-16 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      />
      {status.kind === 'error' && <p className="text-xs text-rose-600">{status.message}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={status.kind === 'saving'}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {status.kind === 'saving' ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setStatus({ kind: 'idle' })
          }}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
