'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AbsenceForm } from './AbsenceForm'

interface Absence {
  id: string
  email: string
  date: string
  reason: string
  display_name: string
}

interface AbsenceCardProps {
  absence: Absence
  isOwn: boolean
  isPast: boolean
  today: string
}

export function AbsenceCard({ absence, isOwn, isPast, today }: AbsenceCardProps) {
  const [status, setStatus] = useState<'idle' | 'deleting' | 'error'>('idle')
  const router = useRouter()

  async function handleRemove() {
    if (!window.confirm(`Remove your absence on ${absence.date}?`)) return
    setStatus('deleting')
    try {
      const response = await fetch(`/api/absences/${absence.id}`, { method: 'DELETE' })
      if (!response.ok) {
        setStatus('error')
        return
      }
      router.refresh()
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className={`rounded-lg p-2 text-sm ${isOwn ? 'bg-slate-100' : 'bg-rose-50'}`}>
      <p className="font-medium text-slate-900">{absence.display_name}</p>
      <p className="text-xs text-slate-600">{absence.reason}</p>
      {isOwn && !isPast && (
        <div className="mt-1 flex items-center gap-3">
          <AbsenceForm today={today} initialDate={absence.date} initialReason={absence.reason} small />
          <button
            onClick={handleRemove}
            disabled={status === 'deleting'}
            className="text-xs text-rose-500 underline hover:text-rose-700 disabled:opacity-50"
          >
            {status === 'deleting' ? 'Removing…' : 'Remove'}
          </button>
          {status === 'error' && <span className="text-xs text-rose-600">Failed</span>}
        </div>
      )}
    </div>
  )
}
