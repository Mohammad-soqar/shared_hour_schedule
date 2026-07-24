import { formatMonthDay, formatWeekdayShort, isWeekend } from '@/lib/dates'
import { hourRangeLabel } from '@/lib/config'
import { ClockMark } from './ClockMark'
import type { AbsenceView, RiyadhClock, SignupView } from './types'

const NOTE_TILTS = ['-1.3', '0.9', '-0.5', '1.4']

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function hourStatus(clock: RiyadhClock, hourStart: number, weekendCrew: number): string {
  if (isWeekend(clock.iso) && weekendCrew === 0) return 'OPT-IN DAY'
  if (clock.hh === hourStart) return `NOW — ${60 - clock.mm} MIN LEFT`
  if (clock.hh < hourStart) {
    const minutesUntil = (hourStart - clock.hh) * 60 - clock.mm
    const h = Math.floor(minutesUntil / 60)
    return `IN ${h > 0 ? `${h}H ` : ''}${minutesUntil % 60}M`
  }
  return 'DONE FOR TODAY'
}

function nextReminderLabel(clock: RiyadhClock): string {
  const isTodayPost = !isWeekend(clock.iso) && clock.hh < 9
  if (isTodayPost) {
    const minutesUntil = (9 - clock.hh) * 60 - clock.mm
    const h = Math.floor(minutesUntil / 60)
    return `TODAY 09:00 · IN ${h > 0 ? `${h}H ` : ''}${minutesUntil % 60}M`
  }
  const day = clock.iso.slice(0)
  const next = nextWeekdayAfter(day)
  return `${formatWeekdayShort(next)} 09:00`
}

function nextWeekdayAfter(date: string): string {
  const d = new Date(`${date}T12:00:00Z`)
  do {
    d.setUTCDate(d.getUTCDate() + 1)
  } while (d.getUTCDay() === 0 || d.getUTCDay() === 6)
  return d.toISOString().slice(0, 10)
}

interface TodayPanelProps {
  today: string
  clock: RiyadhClock | null
  hourStart: number
  heroRows: AbsenceView[]
  heroSignups: SignupView[]
  yourChips: AbsenceView[]
  yourSignupChips: SignupView[]
  maxWeeks: number
  onOpenAdd: () => void
  onEditChip: (absence: AbsenceView) => void
  onEditSignupChip: (signup: SignupView) => void
}

export function TodayPanel({
  today, clock, hourStart, heroRows, heroSignups, yourChips, yourSignupChips,
  maxWeeks, onOpenAdd, onEditChip, onEditSignupChip,
}: TodayPanelProps) {
  const todayIsWeekend = isWeekend(today)
  const totalChips = yourChips.length + yourSignupChips.length
  const heroDate = new Date(`${today}T12:00:00Z`)
  const weekday = heroDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
  const monthYear = heroDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).toUpperCase()

  return (
    <div style={{
      flex: '1 1 310px', maxWidth: 392, minWidth: 0,
      animation: 'shRise 400ms cubic-bezier(0,0,0.2,1) both',
    }}>
      <div style={{
        background: 'var(--paper)', border: '1px solid var(--hairline)', borderRadius: 16,
        boxShadow: '0 2px 6px rgba(9,56,50,0.06),0 18px 44px rgba(9,56,50,0.12)',
        padding: 26, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: 'var(--pine)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'var(--fog)',
          }}>Today · Asia/Riyadh</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#3E5B55', fontVariantNumeric: 'tabular-nums' }}>
            {clock ? (
              <>
                {pad2(clock.hh)}:{pad2(clock.mm)}
                <span style={{ animation: 'shTick 2s ease-in-out infinite' }}>:</span>
                {pad2(clock.ss)}
              </>
            ) : '—:—'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginTop: 12 }}>
          <span className="font-serif-display" style={{ fontSize: 92, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
            {Number(today.slice(8, 10))}
          </span>
          <div>
            <div className="font-serif-display" style={{ fontStyle: 'italic', fontSize: 30, lineHeight: 1, color: 'var(--pine)' }}>
              {weekday}
            </div>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.16em',
              textTransform: 'uppercase', color: 'var(--sage)', marginTop: 7,
            }}>{monthYear}</div>
          </div>
        </div>
        <div style={{
          marginTop: 18, borderRadius: 12, padding: '14px 18px',
          background: 'var(--pine)', boxShadow: '0 6px 18px rgba(0,74,68,0.28)',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{
              fontSize: 10.5, fontWeight: 800, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: 'rgba(250,254,252,0.7)',
            }}>The shared hour</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--paper)' }}>
              {clock ? hourStatus(clock, hourStart, heroSignups.length) : ''}
            </span>
          </div>
          <div className="font-serif-display" style={{
            fontSize: 38, lineHeight: 1.1, marginTop: 4,
            fontVariantNumeric: 'tabular-nums', color: 'var(--paper)',
          }}>{hourRangeLabel(hourStart)}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(250,254,252,0.75)', marginTop: 3 }}>
            every weekday · Riyadh time
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
          <ClockMark size={15} stroke="#5F7B74" strokeWidth={4} showDot={false} />
          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--sage)' }}>
            ROLL CALL — {clock ? nextReminderLabel(clock) : '09:00 WEEKDAYS'}
          </span>
        </div>
        <div style={{ borderTop: '1px dashed #BED3CC', marginTop: 18, paddingTop: 16 }}>
          <div style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'var(--fog)',
          }}>{todayIsWeekend ? 'In today · weekend is opt-in' : 'Out today'}</div>
          {todayIsWeekend ? (
            heroSignups.length === 0 ? (
              <p className="font-hand" style={{
                fontSize: 26, lineHeight: 1.2, color: '#B09B55',
                margin: '10px 0 2px', transform: 'rotate(-1deg)',
              }}>weekend off 🏖 — sign up if you like</p>
            ) : (
              heroSignups.map((row, i) => (
                <div key={row.id} style={{
                  background: 'var(--sand)', borderRadius: 4,
                  boxShadow: '0 2px 5px rgba(92,74,24,0.16)', padding: '9px 12px 7px',
                  marginTop: 10, transform: `rotate(${NOTE_TILTS[i % 4]}deg)`,
                }}>
                  <div style={{
                    fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: 'var(--sand-ink)',
                  }}>🙋 {row.display_name}</div>
                  <div className="font-hand" style={{ fontSize: 19, lineHeight: 1.2, color: 'var(--sand-ink)', marginTop: 1 }}>
                    {row.note || 'in for the hour'}
                    {row.invited_name ? ` · asking ${row.invited_name}` : ''}
                  </div>
                </div>
              ))
            )
          ) : heroRows.length === 0 ? (
            <p className="font-hand" style={{
              fontSize: 26, lineHeight: 1.2, color: 'var(--grass)',
              margin: '10px 0 2px', transform: 'rotate(-1deg)',
            }}>Everyone&apos;s in 🎉</p>
          ) : (
            heroRows.map((row, i) => (
              <div key={row.id} style={{
                background: 'var(--note)', borderRadius: 4,
                boxShadow: '0 2px 5px rgba(9,56,50,0.12)', padding: '9px 12px 7px',
                marginTop: 10, transform: `rotate(${NOTE_TILTS[i % 4]}deg)`,
              }}>
                <div style={{
                  fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: '#1F4740',
                }}>{row.display_name}</div>
                <div className="font-hand" style={{ fontSize: 19, lineHeight: 1.2, color: '#1F4740', marginTop: 1 }}>
                  {row.reason}
                </div>
              </div>
            ))
          )}
        </div>
        <button onClick={onOpenAdd} style={{
          marginTop: 20, width: '100%', height: 48, display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center', gap: 8, border: 'none',
          borderRadius: 9999, background: 'var(--pine)', color: 'var(--paper)',
          fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 0 rgba(0,53,53,0.3)',
        }}>
          + I&apos;ll be away…
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', margin: '18px 6px 0' }}>
        <span style={{
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: 'var(--fog)',
        }}>Your plans</span>
        {yourChips.map((chip) => (
          <button key={chip.id} onClick={() => onEditChip(chip)} title="Away — tap to edit" style={{
            fontSize: 12, fontWeight: 600, color: '#1F4740', background: 'var(--mint)',
            border: '1px solid transparent', borderRadius: 9999, padding: '4px 11px', cursor: 'pointer',
          }}>
            {formatWeekdayShort(chip.date)} {formatMonthDay(chip.date)}
          </button>
        ))}
        {yourSignupChips.map((chip) => (
          <button key={chip.id} onClick={() => onEditSignupChip(chip)} title="Weekend sign-up — tap to edit" style={{
            fontSize: 12, fontWeight: 600, color: 'var(--sand-ink)', background: 'var(--sand)',
            border: '1px solid transparent', borderRadius: 9999, padding: '4px 11px', cursor: 'pointer',
          }}>
            🙋 {formatWeekdayShort(chip.date)} {formatMonthDay(chip.date)}
          </button>
        ))}
        <span style={{ fontSize: 12.5, color: 'var(--sage)' }}>
          {totalChips === 0
            ? 'none yet — the hour is all yours.'
            : `— ${totalChips} ${totalChips === 1 ? 'day' : 'days'} in the next ${maxWeeks} weeks. Tap to edit.`}
        </span>
      </div>
    </div>
  )
}
