import { FormEvent, useState } from 'react'

interface PinModalProps {
  onClose: () => void
  onSaved: () => void
}

export function PinModal({ onClose, onSaved }: PinModalProps) {
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (pin !== confirm) {
      setError("The two PINs don't match.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      const body = await response.json()
      if (!response.ok) {
        setError(body.error ?? 'Could not change the PIN.')
        return
      }
      onSaved()
    } catch {
      setError('Network error — try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    marginTop: 8, display: 'block', width: '100%', height: 44, borderRadius: 10,
    border: '1.5px solid #C4D8D1', background: '#F2F7F4', padding: '0 14px',
    fontSize: 16, outline: 'none', letterSpacing: '0.4em', fontVariantNumeric: 'tabular-nums',
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(12,40,36,0.45)',
      display: 'grid', placeItems: 'center', padding: 16, animation: 'shFade 160ms ease-out',
    }}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} style={{
        background: 'var(--paper)', border: '1px solid var(--hairline)', borderRadius: 18,
        boxShadow: '0 6px 14px rgba(9,56,50,0.1),0 28px 70px rgba(9,56,50,0.22)',
        width: 'min(400px,100%)', padding: '26px 28px', animation: 'shRise 240ms cubic-bezier(0,0,0.2,1)',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: 'var(--sage)',
        }}>Your account</div>
        <h3 className="font-serif-display" style={{ fontWeight: 400, fontSize: 28, lineHeight: 1.15, margin: '8px 0 0' }}>
          New <em style={{ fontStyle: 'italic', color: 'var(--pine)' }}>PIN.</em>
        </h3>
        <label htmlFor="new-pin" style={{
          display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--sage)', margin: '18px 0 0',
        }}>New 6-digit PIN</label>
        <input
          id="new-pin" type="password" required inputMode="numeric" pattern="\d{6}" maxLength={6}
          value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="••••••" style={inputStyle}
        />
        <label htmlFor="confirm-pin" style={{
          display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--sage)', margin: '14px 0 0',
        }}>Same PIN again</label>
        <input
          id="confirm-pin" type="password" required inputMode="numeric" pattern="\d{6}" maxLength={6}
          value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ''))}
          placeholder="••••••" style={inputStyle}
        />
        {error && <p style={{ fontSize: 13, color: 'var(--alert)', margin: '10px 0 0' }}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button type="button" onClick={onClose} style={{
            height: 40, border: 'none', background: 'transparent', borderRadius: 9999,
            padding: '0 16px', fontSize: 14, fontWeight: 600, color: '#3E5B55', cursor: 'pointer',
          }}>Cancel</button>
          <button type="submit" disabled={saving || pin.length !== 6 || confirm.length !== 6} style={{
            height: 40, border: 'none', borderRadius: 9999, background: 'var(--pine)',
            color: 'var(--paper)', fontSize: 14, fontWeight: 600, padding: '0 18px',
            cursor: 'pointer', boxShadow: '0 2px 0 rgba(0,53,53,0.3)',
            opacity: saving || pin.length !== 6 || confirm.length !== 6 ? 0.5 : 1,
          }}>
            {saving ? 'Saving…' : 'Save PIN'}
          </button>
        </div>
      </form>
    </div>
  )
}
