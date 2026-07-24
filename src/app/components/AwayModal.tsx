import { daysOfWeek, formatHuman, formatMonthDay, isWeekend } from '@/lib/dates'
import type { MemberOption, ModalState } from './types'

interface AwayModalProps {
  modal: ModalState
  today: string
  maxWeeks: number
  saving: boolean
  slackConfigured: boolean
  myEmail: string
  members: MemberOption[]
  myReasonOn: (date: string) => string | null
  mySignupOn: (date: string) => { note: string; invited_email: string | null } | null
  onChange: (modal: ModalState) => void
  onClose: () => void
  onSave: () => void
}

const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export function AwayModal({
  modal, today, maxWeeks, saving, slackConfigured, myEmail, members,
  myReasonOn, mySignupOn, onChange, onClose, onSave,
}: AwayModalProps) {
  const isEdit = modal.mode === 'edit'
  const weekend = modal.date !== null && isWeekend(modal.date)
  const isDup = !isEdit && modal.date !== null &&
    (weekend ? mySignupOn(modal.date) !== null : myReasonOn(modal.date) !== null)
  const reasonLength = modal.reason.length
  const noteRequired = !weekend
  const saveDisabled = saving || !modal.date || (noteRequired && modal.reason.trim().length === 0)
  const teammates = members.filter((m) => m.email !== myEmail)

  function pickDate(date: string) {
    if (modal.mode !== 'add') return
    if (isWeekend(date)) {
      const existing = mySignupOn(date)
      onChange({
        ...modal, date,
        reason: modal.reason || existing?.note || '',
        invitedEmail: modal.invitedEmail ?? existing?.invited_email ?? null,
      })
    } else {
      const existing = myReasonOn(date)
      onChange({ ...modal, date, reason: modal.reason || existing || '', invitedEmail: null })
    }
  }

  const eyebrow = isEdit
    ? weekend ? 'Update your sign-up' : 'Update your note'
    : weekend ? 'Weekend sign-up' : 'Leave a note'
  const saveLabel = saving
    ? 'Saving…'
    : weekend
      ? isEdit || isDup ? 'Update my sign-up' : 'Count me in'
      : isEdit || isDup ? 'Update the note' : 'Pin it to the board'

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(12,40,36,0.45)',
      display: 'grid', placeItems: 'center', padding: 16, animation: 'shFade 160ms ease-out',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--paper)', border: '1px solid var(--hairline)', borderRadius: 18,
        boxShadow: '0 6px 14px rgba(9,56,50,0.1),0 28px 70px rgba(9,56,50,0.22)',
        width: 'min(680px,100%)', maxHeight: '88vh', overflowY: 'auto',
        padding: '26px 30px 24px', animation: 'shRise 240ms cubic-bezier(0,0,0.2,1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: weekend ? 'var(--sand-ink)' : 'var(--pine)',
          }}>{eyebrow}</span>
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
              Same day, new <em style={{ fontStyle: 'italic', color: 'var(--pine)' }}>{weekend ? 'plan.' : 'note.'}</em>
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 11.5, fontWeight: 700, letterSpacing: '0.1em',
                background: weekend ? 'var(--sand)' : 'var(--mint)',
                color: weekend ? 'var(--sand-ink)' : undefined,
                borderRadius: 9999, padding: '6px 12px',
              }}>{formatHuman(modal.date).toUpperCase()}</span>
              <span style={{ fontSize: 12, color: 'var(--sage)' }}>
                {weekend ? 'Update the note or who you’re inviting — the day stays.' : 'Only the note changes — the day stays.'}
              </span>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-serif-display" style={{
              fontWeight: 400, fontSize: 32, lineHeight: 1.1, letterSpacing: '-0.01em', margin: '8px 0 0',
            }}>
              {weekend
                ? <>Working the <em style={{ fontStyle: 'italic', color: 'var(--sand-ink)' }}>weekend?</em></>
                : <>Which day will you <em style={{ fontStyle: 'italic', color: 'var(--pine)' }}>miss?</em></>}
            </h2>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '22px 0 8px' }}>
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.16em',
                textTransform: 'uppercase', color: 'var(--sage)',
              }}>Pick a day — weekends are opt-in work days</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--fog)' }}>
                TODAY → {maxWeeks} WEEKS OUT
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7,1fr)', gap: 3, marginBottom: 2 }}>
              <span />
              {WEEKDAY_LABELS.map((wd, i) => (
                <span key={wd} style={{
                  textAlign: 'center', fontSize: 9, fontWeight: 800,
                  letterSpacing: '0.1em', color: i >= 5 ? '#B09B55' : 'var(--fog)',
                }}>{wd}</span>
              ))}
            </div>
            {Array.from({ length: maxWeeks + 1 }, (_, k) => {
              const week = daysOfWeek(today, k)
              return (
                <div key={k} style={{
                  display: 'grid', gridTemplateColumns: '52px repeat(7,1fr)', gap: 3,
                  marginBottom: 3, alignItems: 'center', justifyItems: 'center',
                }}>
                  <span style={{
                    justifySelf: 'start', fontSize: 8.5, fontWeight: 700,
                    letterSpacing: '0.06em', color: 'var(--fog)',
                  }}>{formatMonthDay(week[0])}</span>
                  {week.map((iso) => {
                    const dayWeekend = isWeekend(iso)
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
                          background: selected
                            ? dayWeekend ? 'var(--sand-ink)' : 'var(--pine)'
                            : dayWeekend ? 'var(--sand)' : 'transparent',
                          fontSize: 16,
                          color: selected
                            ? 'var(--paper)'
                            : isToday ? 'var(--pine)' : dayWeekend ? 'var(--sand-ink)' : 'var(--ink)',
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
              <p style={{ fontSize: 12.5, color: weekend ? 'var(--sand-ink)' : 'var(--pine)', margin: '10px 0 0' }}>
                {weekend
                  ? "You're already in this day — saving updates your sign-up."
                  : "You've already marked this day — saving simply updates your note."}
              </p>
            )}
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '24px 0 0' }}>
          <label htmlFor="sh-reason" style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: 'var(--sage)',
          }}>
            {weekend ? 'Optional note — what are you working on?' : 'Your note — the team will see it'}
          </label>
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
            placeholder={weekend ? 'shipping the new landing page…' : 'dentist at 10, back by lunch…'}
            className="font-hand"
            style={{
              display: 'block', width: '100%', minHeight: 96, borderRadius: 4, border: 'none',
              background: weekend ? 'var(--sand)' : 'var(--note)',
              boxShadow: '0 3px 10px rgba(9,56,50,0.14)',
              padding: '16px 16px 12px', fontSize: 22, lineHeight: 1.25,
              color: weekend ? 'var(--sand-ink)' : '#1F4740', resize: 'none', outline: 'none',
            }}
          />
        </div>

        {weekend && (
          <div style={{ marginTop: 18 }}>
            <label htmlFor="sh-invite" style={{
              display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em',
              textTransform: 'uppercase', color: 'var(--sage)',
            }}>Ask a teammate to join you (optional)</label>
            <select
              id="sh-invite"
              value={modal.invitedEmail ?? ''}
              onChange={(e) => onChange({ ...modal, invitedEmail: e.target.value || null })}
              style={{
                marginTop: 8, display: 'block', width: '100%', height: 42, borderRadius: 10,
                border: '1.5px solid #D9C68F', background: 'var(--sand-row)', padding: '0 12px',
                fontSize: 14, outline: 'none', color: 'var(--ink)',
              }}
            >
              <option value="">No one — just me</option>
              {teammates.map((m) => (
                <option key={m.email} value={m.email}>{m.display_name}</option>
              ))}
            </select>
            <p style={{ fontSize: 11.5, color: 'var(--fog)', margin: '6px 0 0' }}>
              They&apos;ll be named in the Slack post — a friendly nudge, not an obligation.
            </p>
          </div>
        )}

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
            borderRadius: 9999, background: weekend ? 'var(--sand-ink)' : 'var(--pine)',
            color: 'var(--paper)', fontSize: 14, fontWeight: 600, padding: '0 20px',
            cursor: saveDisabled ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 0 rgba(0,53,53,0.3)', opacity: saveDisabled ? 0.5 : 1,
          }}>
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
