const RULES: Array<{ bold: string; rest: string }> = [
  { bold: 'Weekdays only.', rest: "No Saturdays, no Sundays — there's no shared hour then." },
  { bold: 'No past days.', rest: '"Today" is decided by Riyadh time, Asia/Riyadh.' },
  { bold: 'Up to 8 weeks ahead.', rest: 'As far as the board can see.' },
  { bold: 'A note is required.', rest: 'Short and human — the team deserves context.' },
  { bold: 'One note per day.', rest: 'Mark the same day twice and we just update your note.' },
  { bold: 'Only yours.', rest: "You can edit or remove your own notes — nobody else's." },
]

export function HouseRules() {
  return (
    <div style={{ flex: '1 1 320px', minWidth: 0, maxWidth: 520 }}>
      <span className="font-serif-display" style={{ fontSize: 26 }}>
        The fine <em style={{ fontStyle: 'italic', color: 'var(--pine)' }}>print.</em>
      </span>
      <div style={{ marginTop: 12 }}>
        {RULES.map((rule, i) => (
          <div key={rule.bold} style={{
            borderTop: '1px dashed #BED3CC',
            borderBottom: i === RULES.length - 1 ? '1px dashed #BED3CC' : undefined,
            padding: '10px 0', display: 'grid', gridTemplateColumns: '36px 1fr',
            gap: 8, alignItems: 'baseline',
          }}>
            <span className="font-serif-display" style={{ fontSize: 18, color: 'var(--pine)' }}>{i + 1}.</span>
            <span style={{ fontSize: 13 }}>
              <strong style={{ fontWeight: 700 }}>{rule.bold}</strong>{' '}
              <span style={{ color: 'var(--sage)' }}>{rule.rest}</span>
            </span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--sage)', margin: '16px 0 0', maxWidth: 440 }}>
        If Slack is ever unreachable, your change still saves — you&apos;ll just see a small warning here.
      </p>
    </div>
  )
}
