import { formatHuman } from '@/lib/dates'
import type { MyInviteView } from './types'

interface InviteBannerProps {
  invites: MyInviteView[]
  busy: boolean
  onRespond: (invite: MyInviteView, action: 'accept' | 'decline') => void
}

export function InviteBanner({ invites, busy, onRespond }: InviteBannerProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
      {invites.map((invite) => (
        <div key={invite.id} style={{
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          background: 'var(--sand)', border: '1.5px solid #D9C68F', borderRadius: 14,
          padding: '14px 18px', boxShadow: '0 4px 14px rgba(92,74,24,0.14)',
          animation: 'shRise 300ms cubic-bezier(0,0,0.2,1) both',
        }}>
          <span style={{ fontSize: 20 }}>🙋</span>
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--sand-ink)' }}>
              {invite.inviterName} asked you to join the weekend hour — {formatHuman(invite.date)}
            </div>
            {invite.note && (
              <div className="font-hand" style={{ fontSize: 18, lineHeight: 1.2, color: '#8a7433', marginTop: 2 }}>
                “{invite.note}”
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => onRespond(invite, 'accept')}
              disabled={busy}
              style={{
                height: 38, border: 'none', borderRadius: 9999, background: 'var(--sand-ink)',
                color: 'var(--paper)', fontSize: 13.5, fontWeight: 600, padding: '0 18px',
                cursor: 'pointer', boxShadow: '0 2px 0 rgba(60,48,16,0.35)', opacity: busy ? 0.6 : 1,
              }}
            >
              I&apos;m in ✓
            </button>
            <button
              onClick={() => onRespond(invite, 'decline')}
              disabled={busy}
              style={{
                height: 38, borderRadius: 9999, background: 'transparent',
                border: '1.5px solid #D9C68F', color: 'var(--sand-ink)', fontSize: 13.5,
                fontWeight: 600, padding: '0 16px', cursor: 'pointer', opacity: busy ? 0.6 : 1,
              }}
            >
              Can&apos;t make it
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
