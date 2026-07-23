import { formatHuman, formatMonthDay, weekdaysOfWeek } from '@/lib/dates'
import type { ModalState } from './types'

interface AwayModalProps {
  modal: ModalState
  today: string
  maxWeeks: number
  saving: boolean
  slackConfigured: boolean
  myReasonOn: (date: string) => string | null
  onChange: (modal: ModalState) => void
  onClose: () => void
  onSave: () => void
}

export function AwayModal({
  modal, today, maxWeeks, saving, slackConfigured, myReasonOn, onChange, onClose, onSave,
}: AwayModalProps) {
  const isEdit = modal.mode === 'edit'
  const isDup = !isEdit && modal.date !== null && myReasonOn(modal.date) !== null
  const reasonLength = modal.reason.length
  const saveDisabled = saving || !modal.date || modal.reason.trim().length === 0

  function pickDate(date: string) {
    if (modal.mode !== 'add') return
    const existing = myReasonOn(date)
    onChange({ ...modal, date, reason: modal.reason || existing || '' })
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(12,40,36,0.45)',
      display: 'grid', placeItems: 'center', padding: 16, animation: 'shFade 160ms ease-out',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--paper)', border: '1px solid var(--hairline)', borderRadius: 18,
        boxShadow: '0 6px 14px rgba(9,56,50,0.1),0 28px 70px rgba(9,56,50,0.22)',
        width: 'min(620px,100%)', maxHeight: '88vh', overflowY: 'auto',
        padding: '26px 30px 24px', animation: 'shRise 240ms cubic-bezier(0,0,0.2,1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'var(--pine)',
          }}>{isEdit ? 'Update your note' : 'Leave a note'}</span>
          <span style={{ flex: 1 }} />
          <button onClick={onClose} title="Close" style={{
            width: 30, height: 30, border: 'none', background: 'transparent',
            borderRadius: 9999, fontSize: 14, color: 'var(--sage)', cursor: 'pointer',
          }}>✕</button>
        </div>

        {isEdit ? (
          <>
            <h2 className="font-serif-display" style={{
              fontWeight: 400, fontSize: 32, lineHeight: 1.1, letterSpacing: '-0.01em', margin: '8px 0 0',
            }}>
              Same day, new <em style={{ fontStyle: 'italic', color: 'var(--pine)' }}>note.</em>
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 11.5, fontWeight: 700, letterSpacing: '0.1em',
                background: 'var(--mint)', borderRadius: 9999, padding: '6px 12px',
              }}>{formatHuman(modal.date).toUpperCase()}</span>
              <span style={{ fontSize: 12, color: 'var(--sage)' }}>Only the note changes — the day stays.</span>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-serif-display" style={{
              fontWeight: 400, fontSize: 32, lineHeight: 1.1, letterSpacing: '-0.01em', margin: '8px 0 0',
            }}>
              Which day will you <em style={{ fontStyle: 'italic', color: 'var(--pine)' }}>miss?</em>
            </h2>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '22px 0 8px' }}>
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.16em',
                textTransform: 'uppercase', color: 'var(--sage)',
              }}>Pick a weekday</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--fog)' }}>
                TODAY → {maxWeeks} WEEKS OUT
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(5,1fr)', gap: 3, marginBottom: 2 }}>
              <span />
              {['MON', 'TUE', 'WED', 'THU', 'FRI'].map((wd) => (
                <span key={wd} style={{
                  textAlign: 'center', fontSize: 9, fontWeight: 800,
                  letterSpacing: '0.1em', color: 'var(--fog)',
                }}>{wd}</span>
              ))}
            </div>
            {Array.from({ length: maxWeeks + 1 }, (_, k) => {
              const week = weekdaysOfWeek(today, k)
              return (
                <div key={k} style={{
                  display: 'grid', gridTemplateColumns: '52px repeat(5,1fr)', gap: 3,
                  marginBottom: 3, alignItems: 'center', justifyItems: 'center',
                }}>
                  <span style={{
                    justifySelf: 'start', fontSize: 8.5, fontWeight: 700,
                    letterSpacing: '0.06em', color: 'var(--fog)',
                  }}>{formatMonthDay(week[0])}</span>
                  {week.map((iso) => {
                    const disabled = iso < today
                    const selected = iso === modal.date
                    const isToday = iso === today
                    return (
                      <button
                        key={iso}
                        onClick={() => pickDate(iso)}
                        disabled={disabled}
                        className="font-serif-display"
                        style={{
                          width: 37, height: 37, border: '1.5px solid transparent', borderRadius: 9999,
                          background: selected ? 'var(--pine)' : 'transparent',
                          fontSize: 16,
                          color: selected ? 'var(--paper)' : isToday ? 'var(--pine)' : 'var(--ink)',
                          borderColor: !selected && isToday ? 'var(--pine)' : 'transparent',
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          opacity: disabled ? 0.28 : 1,
                        }}
                      >
                        {Number(iso.slice(8, 10))}
                      </button>
                    )
                  })}
                </div>
              )
            })}
            {isDup && (
              <p style={{ fontSize: 12.5, color: 'var(--pine)', margin: '10px 0 0' }}>
                You&apos;ve already marked this day — saving simply updates your note.
              </p>
            )}
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '24px 0 0' }}>
          <label htmlFor="sh-reason" style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: 'var(--sage)',
          }}>Your note — the team will see it</label>
          <span style={{ flex: 1 }} />
          <span style={{
            fontSize: 10.5, fontWeight: 700,
            color: reasonLength >= 500 ? 'var(--alert)' : 'var(--fog)',
          }}>{reasonLength}/500</span>
        </div>
        <div style={{ position: 'relative', marginTop: 14 }}>
          <div style={{
            position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%) rotate(-2deg)',
            width: 56, height: 16, background: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(9,56,50,0.08)', zIndex: 1,
          }} />
          <textarea
            id="sh-reason"
            value={modal.reason}
            onChange={(e) => onChange({ ...modal, reason: e.target.value })}
            maxLength={500}
            rows={3}
            placeholder="dentist at 10, back by lunch…"
            className="font-hand"
            style={{
              display: 'block', width: '100%', minHeight: 96, borderRadius: 4, border: 'none',
              background: 'var(--note)', boxShadow: '0 3px 10px rgba(9,56,50,0.14)',
              padding: '16px 16px 12px', fontSize: 22, lineHeight: 1.25,
              color: '#1F4740', resize: 'none', outline: 'none',
            }}
          />
        </div>
        <p style={{ fontSize: 12, color: 'var(--fog)', margin: '8px 0 0' }}>
          Short and human is perfect — it shows on the board and in Slack.
        </p>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          borderTop: '1px dashed #BED3CC', marginTop: 22, paddingTop: 16,
        }}>
          <span style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em',
            color: slackConfigured ? 'var(--fog)' : 'var(--alert)',
          }}>
            {slackConfigured
              ? 'POSTS TO #SHARED-HOUR THE MOMENT YOU SAVE'
              : 'WEBHOOK NOT CONFIGURED — SAVES WITHOUT NOTIFYING'}
          </span>
          <span style={{ flex: 1 }} />
          <button onClick={onClose} style={{
            height: 40, border: 'none', background: 'transparent', borderRadius: 9999,
            padding: '0 16px', fontSize: 14, fontWeight: 600, color: '#3E5B55', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={onSave} disabled={saveDisabled} style={{
            height: 40, display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none',
            borderRadius: 9999, background: 'var(--pine)', color: 'var(--paper)',
            fontSize: 14, fontWeight: 600, padding: '0 20px',
            cursor: saveDisabled ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 0 rgba(0,53,53,0.3)', opacity: saveDisabled ? 0.5 : 1,
          }}>
            {saving ? 'Saving…' : isEdit || isDup ? 'Update the note' : 'Pin it to the board'}
          </button>
        </div>
      </div>
    </div>
  )
}
