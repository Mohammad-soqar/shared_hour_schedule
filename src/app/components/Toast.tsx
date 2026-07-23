import type { ToastState } from './types'

export function Toast({ toast }: { toast: ToastState }) {
  return (
    <div style={{
      position: 'fixed', left: '50%', bottom: 26, transform: 'translateX(-50%)', zIndex: 80,
      background: 'var(--paper)', borderRadius: 9999,
      boxShadow: '0 4px 10px rgba(9,56,50,0.12),0 12px 34px rgba(9,56,50,0.18)',
      padding: '12px 20px', fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap',
      maxWidth: 'calc(100vw - 32px)', overflow: 'hidden', textOverflow: 'ellipsis',
      animation: 'shToast 240ms cubic-bezier(0,0,0.2,1)',
      border: toast.warn ? '1.5px solid oklch(0.55 0.18 30 / 0.5)' : '1px solid var(--hairline)',
      color: toast.warn ? 'var(--alert)' : 'var(--ink)',
    }}>
      {toast.text}
    </div>
  )
}
