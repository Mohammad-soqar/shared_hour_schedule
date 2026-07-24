'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { hourRangeLabel } from '@/lib/config'
import { isWeekend } from '@/lib/dates'
import type { Member } from '@/lib/absences'
import { AwayModal } from './AwayModal'
import { ClockMark } from './ClockMark'
import { HouseRules } from './HouseRules'
import { RemoveModal } from './RemoveModal'
import { SlackPanel } from './SlackPanel'
import { Toast } from './Toast'
import { TodayPanel } from './TodayPanel'
import { WeekLedger } from './WeekLedger'
import type {
  AbsenceView, MemberOption, ModalState, PinnedPost, RemovalTarget,
  RiyadhClock, SignupView, SlackEvent, ToastState,
} from './types'

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
  signups: SignupView[]
  members: MemberOption[]
  events: SlackEvent[]
  pinned: PinnedPost
  hourStart: number
  slackConfigured: boolean
}

export function BoardClient({
  member, today, offset, maxWeeks, days, absences, signups, members,
  events, pinned, hourStart, slackConfigured,
}: BoardClientProps) {
  const router = useRouter()
  const [clock, setClock] = useState<RiyadhClock | null>(null)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [removeTarget, setRemoveTarget] = useState<RemovalTarget | null>(null)
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

  const signupsByDay = useMemo(() => {
    const map = new Map<string, SignupView[]>()
    for (const signup of signups) {
      const list = map.get(signup.date) ?? []
      map.set(signup.date, [...list, signup])
    }
    return map
  }, [signups])

  const heroRows = absencesByDay.get(today) ?? []
  const heroSignups = signupsByDay.get(today) ?? []
  const yourChips = useMemo(
    () => absences
      .filter((a) => a.email === member.email && a.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [absences, member.email, today],
  )
  const yourSignupChips = useMemo(
    () => signups
      .filter((s) => s.email === member.email && s.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [signups, member.email, today],
  )

  function myReasonOn(date: string): string | null {
    return absences.find((a) => a.email === member.email && a.date === date)?.reason ?? null
  }

  function mySignupOn(date: string): { note: string; invited_email: string | null } | null {
    const signup = signups.find((s) => s.email === member.email && s.date === date)
    return signup ? { note: signup.note, invited_email: signup.invited_email } : null
  }

  async function saveModal() {
    if (!modal || !modal.date) return
    const weekend = isWeekend(modal.date)
    if (!weekend && !modal.reason.trim()) return
    const wasUpdate = modal.mode === 'edit' ||
      (weekend ? mySignupOn(modal.date) !== null : myReasonOn(modal.date) !== null)
    setBusy(true)
    try {
      const response = await fetch(weekend ? '/api/signups' : '/api/absences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(weekend
          ? { date: modal.date, note: modal.reason, invitedEmail: modal.invitedEmail }
          : { date: modal.date, reason: modal.reason }),
      })
      const body = await response.json()
      if (!response.ok) {
        setToast({ warn: true, text: body.error ?? 'Something went wrong — try again.' })
        return
      }
      setModal(null)
      const okText = weekend
        ? wasUpdate ? '✅ Sign-up updated — the channel knows.' : "🙋 You're in — posted to #shared-hour."
        : wasUpdate ? '✅ Updated — the channel knows.' : '✅ Pinned to the board — posted to #shared-hour.'
      setToast(body.slackOk
        ? { warn: false, text: okText }
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
    const endpoint = removeTarget.kind === 'signup'
      ? `/api/signups/${removeTarget.id}`
      : `/api/absences/${removeTarget.id}`
    setBusy(true)
    try {
      const response = await fetch(endpoint, { method: 'DELETE' })
      const body = await response.json()
      if (!response.ok) {
        setToast({ warn: true, text: body.error ?? 'Could not remove — try again.' })
        return
      }
      const okText = removeTarget.kind === 'signup'
        ? '✋ Taken off — the channel knows.'
        : '✅ Removed — #shared-hour got the all-clear.'
      setRemoveTarget(null)
      setToast(body.slackOk
        ? { warn: false, text: okText }
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
            heroSignups={heroSignups}
            yourChips={yourChips}
            yourSignupChips={yourSignupChips}
            maxWeeks={maxWeeks}
            onOpenAdd={() => setModal({ mode: 'add', date: null, reason: '', invitedEmail: null })}
            onEditChip={(a) => setModal({ mode: 'edit', date: a.date, reason: a.reason, invitedEmail: null })}
            onEditSignupChip={(s) => setModal({ mode: 'edit', date: s.date, reason: s.note, invitedEmail: s.invited_email })}
          />
          <WeekLedger
            days={days}
            today={today}
            offset={offset}
            maxWeeks={maxWeeks}
            myEmail={member.email}
            absencesByDay={absencesByDay}
            signupsByDay={signupsByDay}
            onNavigate={navigate}
            onAddDay={(date) => setModal(isWeekend(date)
              ? { mode: 'add', date, reason: mySignupOn(date)?.note ?? '', invitedEmail: mySignupOn(date)?.invited_email ?? null }
              : { mode: 'add', date, reason: myReasonOn(date) ?? '', invitedEmail: null })}
            onEditAbsence={(a) => setModal({ mode: 'edit', date: a.date, reason: a.reason, invitedEmail: null })}
            onEditSignup={(s) => setModal({ mode: 'edit', date: s.date, reason: s.note, invitedEmail: s.invited_email })}
            onRemoveAbsence={(a) => setRemoveTarget({ id: a.id, date: a.date, kind: 'absence' })}
            onRemoveSignup={(s) => setRemoveTarget({ id: s.id, date: s.date, kind: 'signup' })}
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
          myEmail={member.email}
          members={members}
          myReasonOn={myReasonOn}
          mySignupOn={mySignupOn}
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
