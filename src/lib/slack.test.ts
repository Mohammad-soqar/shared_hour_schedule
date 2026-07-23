import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  absenceCancelledMessage, absenceMarkedMessage, absenceUpdatedMessage,
  dailyReminderMessage, sendSlackMessage,
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
