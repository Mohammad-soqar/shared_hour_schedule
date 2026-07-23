import type { PinnedPost, SlackEvent } from './types'

interface SlackPanelProps {
  events: SlackEvent[]
  pinned: PinnedPost
  slackConfigured: boolean
}

export function SlackPanel({ events, pinned, slackConfigured }: SlackPanelProps) {
  const statusColor = slackConfigured ? 'var(--fog)' : 'var(--alert)'
  const dotColor = slackConfigured ? 'var(--grass)' : 'var(--alert)'
  return (
    <div style={{ flex: '1 1 360px', minWidth: 0, maxWidth: 560 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span className="font-serif-display" style={{ fontSize: 26 }}>
          What Slack <em style={{ fontStyle: 'italic', color: 'var(--pine)' }}>hears.</em>
        </span>
        <span style={{ flex: 1 }} />
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 9.5,
          fontWeight: 700, letterSpacing: '0.12em', color: statusColor,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: 9999, background: dotColor }} />
          {slackConfigured ? 'WEBHOOK CONNECTED' : 'WEBHOOK NOT CONFIGURED'}
        </span>
      </div>
      <div style={{
        marginTop: 12, background: 'var(--paper)', border: '1px solid var(--hairline)',
        borderRadius: 12, boxShadow: '0 2px 6px rgba(9,56,50,0.06),0 12px 34px rgba(9,56,50,0.09)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '11px 16px', borderBottom: '1px solid #E3EEE9',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#1F4740' }}>#SHARED-HOUR</span>
          <span style={{ fontSize: 10, color: 'var(--fog)', letterSpacing: '0.1em' }}>· VIA INCOMING WEBHOOK</span>
        </div>
        <div style={{ background: 'var(--note)', padding: '12px 16px', borderBottom: '1px solid #E3EEE9' }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--sage)' }}>
            {pinned.label}
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 5, color: 'var(--ink)' }}>
            {pinned.text}
          </div>
        </div>
        <div style={{ maxHeight: 290, overflowY: 'auto' }}>
          {events.map((ev, i) => (
            <div key={i} style={{
              padding: '11px 16px', borderBottom: '1px dashed #E3EEE9',
              display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'baseline',
            }}>
              <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ink)' }}>{ev.text}</span>
              <span style={{
                fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em',
                color: 'var(--fog)', whiteSpace: 'nowrap',
              }}>{ev.time}</span>
            </div>
          ))}
          {events.length === 0 && (
            <div className="font-hand" style={{ padding: '18px 16px', fontSize: 20, color: 'var(--fog)' }}>
              No posts yet — pin a note to the board and watch this feed.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
