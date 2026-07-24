import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  absenceCancelledMessage, absenceMarkedMessage, absenceUpdatedMessage,
  dailyReminderMessage, sendSlackMessage, signupCancelledMessage, signupMessage,
  weekendReminderMessage,
} from './slack'

describe('message formatting', () => {
  test('marked', () => {
    expect(absenceMarkedMessage('Sara', '2026-07-24', 'travel'))
      .toBe("🚫 Sara won't be available Friday, Jul 24 — travel")
  })
  test('updated', () => {
    expect(absenceUpdatedMessage('Sara', '2026-07-24', 'sick'))
      .toBe("✏️ Sara's absence on Friday, Jul 24 updated — sick")
  })
  test('cancelled', () => {
    expect(absenceCancelledMessage('Sara', '2026-07-24'))
      .toBe('✅ Sara is now available Friday, Jul 24')
  })
  test('reminder with nobody out', () => {
    expect(dailyReminderMessage([])).toBe("⏰ Shared hour today — everyone's in!")
  })
  test('reminder with people out', () => {
    expect(dailyReminderMessage([{ name: 'Sara', reason: 'travel' }, { name: 'Ali', reason: 'sick' }]))
      .toBe('⏰ Shared hour today — out: Sara (travel), Ali (sick)')
  })
  test('escapes slack mrkdwn control characters in user text', () => {
    expect(absenceMarkedMessage('Sara', '2026-07-24', '<!channel> A & B <https://evil.example|here>'))
      .toBe("🚫 Sara won't be available Friday, Jul 24 — &lt;!channel&gt; A &amp; B &lt;https://evil.example|here&gt;")
  })
  test('escapes user text in the daily reminder', () => {
    expect(dailyReminderMessage([{ name: '<Sara>', reason: 'a & b' }]))
      .toBe('⏰ Shared hour today — out: &lt;Sara&gt; (a &amp; b)')
  })
  test('weekend signup with note and invite', () => {
    expect(signupMessage('Sara', '2026-07-25', 'shipping the demo', 'Ali'))
      .toBe('🙋 Sara is in for the shared hour Saturday, Jul 25 — shipping the demo · asking Ali to join')
  })
  test('weekend signup without note or invite', () => {
    expect(signupMessage('Sara', '2026-07-25', '', null))
      .toBe('🙋 Sara is in for the shared hour Saturday, Jul 25')
  })
  test('signup cancelled', () => {
    expect(signupCancelledMessage('Sara', '2026-07-25'))
      .toBe('✋ Sara pulled out of Saturday, Jul 25')
  })
  test('weekend reminder lists who is in', () => {
    expect(weekendReminderMessage([{ name: 'Sara', note: 'demo' }, { name: 'Ali', note: '' }]))
      .toBe('⏰ Weekend shared hour today — in: Sara (demo), Ali')
  })
  test('weekend signup escapes user text', () => {
    expect(signupMessage('<Sara>', '2026-07-25', 'a & b', '<Ali>'))
      .toBe('🙋 &lt;Sara&gt; is in for the shared hour Saturday, Jul 25 — a &amp; b · asking &lt;Ali&gt; to join')
  })
})

describe('sendSlackMessage', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  test('posts text to webhook and returns true', async () => {
    vi.stubEnv('SLACK_WEBHOOK_URL', 'https://hooks.slack.example/x')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    expect(await sendSlackMessage('hello')).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith('https://hooks.slack.example/x', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'hello' }),
    })
  })
  test('returns false when fetch rejects', async () => {
    vi.stubEnv('SLACK_WEBHOOK_URL', 'https://hooks.slack.example/x')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')))
    expect(await sendSlackMessage('hello')).toBe(false)
  })
  test('returns false on non-2xx response', async () => {
    vi.stubEnv('SLACK_WEBHOOK_URL', 'https://hooks.slack.example/x')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await sendSlackMessage('hello')).toBe(false)
  })
  test('returns false when env missing', async () => {
    vi.stubEnv('SLACK_WEBHOOK_URL', '')
    expect(await sendSlackMessage('hello')).toBe(false)
  })
})
