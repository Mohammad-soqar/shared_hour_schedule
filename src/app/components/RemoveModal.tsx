import { formatHuman } from '@/lib/dates'
import type { AbsenceView } from './types'

interface RemoveModalProps {
  target: AbsenceView
  removing: boolean
  onKeep: () => void
  onConfirm: () => void
}

export function RemoveModal({ target, removing, onKeep, onConfirm }: RemoveModalProps) {
  return (
    <div onClick={onKeep} style={{
      position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(12,40,36,0.45)',
      display: 'grid', placeItems: 'center', padding: 16, animation: 'shFade 160ms ease-out',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--paper)', border: '1px solid var(--hairline)', borderRadius: 18,
        boxShadow: '0 6px 14px rgba(9,56,50,0.1),0 28px 70px rgba(9,56,50,0.22)',
        width: 'min(440px,100%)', padding: '26px 28px', animation: 'shRise 240ms cubic-bezier(0,0,0.2,1)',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: 'var(--sage)',
        }}>Cancel an absence</div>
        <h3 className="font-serif-display" style={{ fontWeight: 400, fontSize: 28, lineHeight: 1.15, margin: '8px 0 0' }}>
          Plans <em style={{ fontStyle: 'italic', color: 'var(--pine)' }}>changed?</em>
        </h3>
        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--sage)', margin: '10px 0 0' }}>
          We&apos;ll take <strong style={{ color: 'var(--ink)', fontWeight: 700 }}>{formatHuman(target.date)}</strong>{' '}
          off the board and post a ✅ all-clear to #shared-hour so the team knows.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
          <button onClick={onKeep} style={{
            height: 40, border: 'none', background: 'transparent', borderRadius: 9999,
            padding: '0 16px', fontSize: 14, fontWeight: 600, color: '#3E5B55', cursor: 'pointer',
          }}>Keep it</button>
          <button onClick={onConfirm} disabled={removing} style={{
            height: 40, border: 'none', borderRadius: 9999, background: 'var(--alert)',
            color: 'var(--paper)', fontSize: 14, fontWeight: 600, padding: '0 18px',
            cursor: removing ? 'wait' : 'pointer', boxShadow: '0 2px 0 rgba(74,20,10,0.3)',
            opacity: removing ? 0.6 : 1,
          }}>
            {removing ? 'Removing…' : "Remove — I'll be there"}
          </button>
        </div>
      </div>
    </div>
  )
}
