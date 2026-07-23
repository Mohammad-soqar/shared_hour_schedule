import { formatMonthDay, formatWeekdayShort } from '@/lib/dates'
import type { AbsenceView } from './types'

const NOTE_TILTS = ['-1.3', '0.9', '-0.5', '1.4']

interface WeekLedgerProps {
  days: string[]
  today: string
  offset: number
  maxWeeks: number
  myEmail: string
  absencesByDay: Map<string, AbsenceView[]>
  onNavigate: (offset: number) => void
  onAddDay: (date: string) => void
  onEdit: (absence: AbsenceView) => void
  onRemove: (absence: AbsenceView) => void
}

export function WeekLedger({
  days, today, offset, maxWeeks, myEmail, absencesByDay,
  onNavigate, onAddDay, onEdit, onRemove,
}: WeekLedgerProps) {
  const weekTag = offset === 0 ? 'THIS WEEK' : `+${offset} ${offset === 1 ? 'WEEK' : 'WEEKS'}`
  const navButton = (disabled: boolean): React.CSSProperties => ({
    width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    border: '1.5px solid var(--ink)', borderRadius: 9999, background: 'transparent',
    color: 'var(--ink)', fontSize: 15, cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.3 : 1, pointerEvents: disabled ? 'none' : undefined,
  })

  return (
    <div style={{
      flex: '999 1 460px', minWidth: 0,
      animation: 'shRise 400ms cubic-bezier(0,0,0.2,1) 60ms both',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <span className="font-serif-display" style={{ fontSize: 30, letterSpacing: '-0.01em' }}>
          The week of <em style={{ fontStyle: 'italic' }}>{formatMonthDay(days[0])} – {formatMonthDay(days[days.length - 1])}</em>
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
          ...(offset === 0
            ? { color: 'var(--paper)', background: 'var(--pine)', borderRadius: 9999, padding: '4px 9px' }
            : { color: 'var(--sage)', border: '1.5px solid #BED3CC', borderRadius: 9999, padding: '2.5px 9px' }),
        }}>{weekTag}</span>
        <span style={{ flex: 1 }} />
        {offset > 0 && (
          <button onClick={() => onNavigate(0)} style={{
            border: 'none', background: 'transparent', fontSize: 12.5, fontWeight: 600,
            color: 'var(--sage)', cursor: 'pointer', padding: '6px 10px', borderRadius: 9999,
          }}>
            back to this week
          </button>
        )}
        <button onClick={() => onNavigate(offset - 1)} title="Earlier week" style={navButton(offset <= 0)}>←</button>
        <button onClick={() => onNavigate(offset + 1)} title={`Later week (up to ${maxWeeks} ahead)`} style={navButton(offset >= maxWeeks)}>→</button>
      </div>

      <div style={{
        background: 'var(--paper)', border: '1px solid var(--hairline)', borderRadius: 16,
        boxShadow: '0 2px 6px rgba(9,56,50,0.06),0 12px 34px rgba(9,56,50,0.09)', overflow: 'hidden',
      }}>
        {days.map((day) => {
          const rows = absencesByDay.get(day) ?? []
          const isToday = day === today
          const isPast = day < today
          const fadeStyle: React.CSSProperties = isPast ? { opacity: 0.45 } : {}
          return (
            <div key={day} style={{
              display: 'grid', gridTemplateColumns: '92px 1fr', gap: 16,
              padding: '18px 22px 16px 18px', borderTop: '1px dashed #C6D9D2',
              marginTop: -1, position: 'relative',
              background: isToday ? '#E9F3EE' : undefined,
            }}>
              {isToday && (
                <>
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 4, background: 'var(--pine)' }} />
                  <span style={{
                    position: 'absolute', top: 12, right: 14, fontSize: 9, fontWeight: 800,
                    letterSpacing: '0.2em', color: 'var(--pine)', border: '1.5px solid var(--pine)',
                    borderRadius: 4, padding: '3px 7px 2px', transform: 'rotate(-5deg)', background: 'var(--paper)',
                  }}>TODAY</span>
                </>
              )}
              <div style={fadeStyle}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.2em',
                  color: isToday ? 'var(--pine)' : 'var(--sage)',
                }}>{formatWeekdayShort(day)}</div>
                <div className="font-serif-display" style={{ fontSize: 42, lineHeight: 1, marginTop: 2 }}>
                  {Number(day.slice(8, 10))}
                </div>
                <div style={{
                  fontSize: 9.5, fontWeight: 700, letterSpacing: '0.16em',
                  color: 'var(--fog)', marginTop: 3,
                }}>{formatMonthDay(day).split(' ')[0]}</div>
              </div>
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start',
                alignContent: 'flex-start', paddingRight: 44, ...fadeStyle,
              }}>
                {rows.map((row, i) => {
                  const isYou = row.email === myEmail
                  return (
                    <div key={row.id} style={{
                      position: 'relative', background: 'var(--note)', borderRadius: 4,
                      boxShadow: '0 3px 8px rgba(9,56,50,0.14)', padding: '13px 14px 9px',
                      maxWidth: 230, transform: `rotate(${NOTE_TILTS[i % 4]}deg)`,
                    }}>
                      <div style={{
                        position: 'absolute', top: -7, left: '50%',
                        transform: 'translateX(-50%) rotate(-2deg)', width: 44, height: 14,
                        background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(9,56,50,0.08)',
                      }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em',
                          textTransform: 'uppercase', color: '#1F4740',
                        }}>{row.display_name}</span>
                        {isYou && (
                          <span style={{
                            fontSize: 8, fontWeight: 800, letterSpacing: '0.14em',
                            color: 'var(--paper)', background: 'var(--pine)',
                            borderRadius: 3, padding: '2px 4px',
                          }}>YOU</span>
                        )}
                      </div>
                      <div className="font-hand" style={{ fontSize: 20, lineHeight: 1.2, color: '#1F4740', marginTop: 2 }}>
                        {row.reason}
                      </div>
                      {isYou && !isPast && (
                        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                          <button onClick={() => onEdit(row)} style={{
                            border: 'none', background: 'transparent', padding: 0, fontSize: 9.5,
                            fontWeight: 800, letterSpacing: '0.12em', color: 'var(--sage)', cursor: 'pointer',
                          }}>EDIT</button>
                          <button onClick={() => onRemove(row)} style={{
                            border: 'none', background: 'transparent', padding: 0, fontSize: 9.5,
                            fontWeight: 800, letterSpacing: '0.12em', color: 'var(--sage)', cursor: 'pointer',
                          }}>REMOVE</button>
                        </div>
                      )}
                    </div>
                  )
                })}
                {rows.length === 0 && (
                  <span className="font-hand" style={{
                    fontSize: 22, color: isPast ? 'var(--fog)' : 'var(--grass)',
                    transform: 'rotate(-1deg)', alignSelf: 'center',
                  }}>
                    {isPast ? 'everyone was in.' : "Everyone's in 🎉"}
                  </span>
                )}
                {!isPast && (
                  <button onClick={() => onAddDay(day)} title="Mark yourself away this day" style={{
                    alignSelf: 'center', width: 34, height: 34, border: '1.5px dashed #A9C4BB',
                    borderRadius: 9999, background: 'transparent', color: 'var(--fog)',
                    fontSize: 16, cursor: 'pointer',
                  }}>+</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
