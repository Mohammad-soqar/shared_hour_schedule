'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { hourRangeLabel } from '@/lib/config'
import type { Member } from '@/lib/absences'
import { AwayModal } from './AwayModal'
import { ClockMark } from './ClockMark'
import { HouseRules } from './HouseRules'
import { RemoveModal } from './RemoveModal'
import { SlackPanel } from './SlackPanel'
import { Toast } from './Toast'
import { TodayPanel } from './TodayPanel'
import { WeekLedger } from './WeekLedger'
import type { AbsenceView, ModalState, PinnedPost, RiyadhClock, SlackEvent, ToastState } from './types'

const TOAST_MS = 4200

function riyadhClock(): RiyadhClock {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date())
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  return {
    iso: `${get('year')}-${get('month')}-${get('day')}`,
    hh: Number(get('hour')), mm: Number(get('minute')), ss: Number(get('second')),
  }
}

interface BoardClientProps {
  member: Member
  today: string
  offset: number
  maxWeeks: number
  days: string[]
  absences: AbsenceView[]
  events: SlackEvent[]
  pinned: PinnedPost
  hourStart: number
  slackConfigured: boolean
}

export function BoardClient({
  member, today, offset, maxWeeks, days, absences, events, pinned, hourStart, slackConfigured,
}: BoardClientProps) {
  const router = useRouter()
  const [clock, setClock] = useState<RiyadhClock | null>(null)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [removeTarget, setRemoveTarget] = useState<AbsenceView | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const tick = () => setClock(riyadhClock())
    const firstTick = requestAnimationFrame(tick)
    const timer = setInterval(tick, 1000)
    return () => {
      cancelAnimationFrame(firstTick)
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), TOAST_MS)
    return () => clearTimeout(timer)
  }, [toast])

  const absencesByDay = useMemo(() => {
    const map = new Map<string, AbsenceView[]>()
    for (const absence of absences) {
      const list = map.get(absence.date) ?? []
      map.set(absence.date, [...list, absence])
    }
    return map
  }, [absences])

  const heroRows = absencesByDay.get(today) ?? []
  const yourChips = useMemo(
    () => absences
      .filter((a) => a.email === member.email && a.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [absences, member.email, today],
  )

  function myReasonOn(date: string): string | null {
    return absences.find((a) => a.email === member.email && a.date === date)?.reason ?? null
  }

  async function saveModal() {
    if (!modal || !modal.date || !modal.reason.trim()) return
    const wasUpdate = modal.mode === 'edit' || myReasonOn(modal.date) !== null
    setBusy(true)
    try {
      const response = await fetch('/api/absences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: modal.date, reason: modal.reason }),
      })
      const body = await response.json()
      if (!response.ok) {
        setToast({ warn: true, text: body.error ?? 'Something went wrong — try again.' })
        return
      }
      setModal(null)
      setToast(body.slackOk
        ? {
            warn: false,
            text: wasUpdate ? '✅ Updated — the channel knows.' : '✅ Pinned to the board — posted to #shared-hour.',
          }
        : { warn: true, text: 'Saved — but the Slack notification failed. The board is up to date.' })
      router.refresh()
    } catch {
      setToast({ warn: true, text: 'Network error — nothing saved. Try again.' })
    } finally {
      setBusy(false)
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return
    setBusy(true)
    try {
      const response = await fetch(`/api/absences/${removeTarget.id}`, { method: 'DELETE' })
      const body = await response.json()
      if (!response.ok) {
        setToast({ warn: true, text: body.error ?? 'Could not remove — try again.' })
        return
      }
      setRemoveTarget(null)
      setToast(body.slackOk
        ? { warn: false, text: '✅ Removed — #shared-hour got the all-clear.' }
        : { warn: true, text: "Removed — but Slack didn't hear about it." })
      router.refresh()
    } catch {
      setToast({ warn: true, text: 'Network error — nothing removed. Try again.' })
    } finally {
      setBusy(false)
    }
  }

  function navigate(nextOffset: number) {
    const clamped = Math.min(Math.max(nextOffset, 0), maxWeeks)
    router.push(clamped === 0 ? '/' : `/?week=${clamped}`)
  }

  const initials = member.display_name
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 40, background: 'rgba(237,244,241,0.9)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--hairline)',
      }}>
        <div style={{
          maxWidth: 1240, margin: '0 auto', padding: '12px 24px',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <ClockMark size={26} />
          <span className="font-serif-display" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>
            Shared <em style={{ fontStyle: 'italic', color: 'var(--pine)' }}>Hour</em>
          </span>
          <div style={{ flex: 1 }} />
          <span style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--pine)',
            background: 'rgba(0,106,106,0.12)', borderRadius: 9999, padding: '5px 12px', whiteSpace: 'nowrap',
          }}>THE HOUR · {hourRangeLabel(hourStart)}</span>
          <span title="Asia/Riyadh decides what 'today' means" style={{
            fontSize: 12, fontWeight: 600, letterSpacing: '0.1em',
            color: 'var(--sage)', fontVariantNumeric: 'tabular-nums',
          }}>
            RIYADH {clock ? `${String(clock.hh).padStart(2, '0')}:${String(clock.mm).padStart(2, '0')}` : '--:--'}
          </span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--hairline)',
            borderRadius: 9999, padding: '3px 5px 3px 3px', background: 'var(--paper)',
          }}>
            <span style={{
              width: 26, height: 26, borderRadius: 9999, background: 'var(--mint)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: '#1F4740',
            }}>{initials}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{member.display_name}</span>
            <form action="/api/auth/signout" method="post" style={{ display: 'contents' }}>
              <button style={{
                border: 'none', background: 'transparent', fontSize: 12, color: 'var(--sage)',
                cursor: 'pointer', padding: '4px 8px', borderRadius: 9999,
              }}>sign out</button>
            </form>
          </div>
        </div>
      </header>

      <main style={{ width: '100%', maxWidth: 1240, margin: '0 auto', padding: '34px 24px 56px', flex: 1 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 34, alignItems: 'flex-start' }}>
          <TodayPanel
            today={today}
            clock={clock}
            hourStart={hourStart}
            heroRows={heroRows}
            yourChips={yourChips}
            maxWeeks={maxWeeks}
            onOpenAdd={() => setModal({ mode: 'add', date: null, reason: '' })}
            onEditChip={(a) => setModal({ mode: 'edit', date: a.date, reason: a.reason })}
          />
          <WeekLedger
            days={days}
            today={today}
            offset={offset}
            maxWeeks={maxWeeks}
            myEmail={member.email}
            absencesByDay={absencesByDay}
            onNavigate={navigate}
            onAddDay={(date) => setModal({ mode: 'add', date, reason: myReasonOn(date) ?? '' })}
            onEdit={(a) => setModal({ mode: 'edit', date: a.date, reason: a.reason })}
            onRemove={setRemoveTarget}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 34, alignItems: 'flex-start', marginTop: 44 }}>
          <SlackPanel events={events} pinned={pinned} slackConfigured={slackConfigured} />
          <HouseRules />
        </div>
      </main>

      <footer style={{ borderTop: '1px solid var(--hairline)' }}>
        <div style={{
          maxWidth: 1240, margin: '0 auto', padding: '18px 24px 38px',
          display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'space-between',
          fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--fog)',
        }}>
          <span>SHARED HOUR — THE TEAM&apos;S DAYBOOK</span>
          <span>NEXT.JS · SUPABASE · SLACK WEBHOOK · CRON 0 6 * * 1-5</span>
        </div>
      </footer>

      {modal && (
        <AwayModal
          modal={modal}
          today={today}
          maxWeeks={maxWeeks}
          saving={busy}
          slackConfigured={slackConfigured}
          myReasonOn={myReasonOn}
          onChange={setModal}
          onClose={() => setModal(null)}
          onSave={saveModal}
        />
      )}
      {removeTarget && (
        <RemoveModal
          target={removeTarget}
          removing={busy}
          onKeep={() => setRemoveTarget(null)}
          onConfirm={confirmRemove}
        />
      )}
      {toast && <Toast toast={toast} />}
    </div>
  )
}
