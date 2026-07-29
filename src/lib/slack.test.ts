import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  absenceCancelledMessage, absenceMarkedMessage, absenceUpdatedMessage,
  dailyReminderMessage, inviteAcceptedMessage, inviteDeclinedMessage,
  sendSlackMessage, signupCancelledMessage, signupMessage, weekendReminderMessage,
} from './slack'

const SARA = { name: 'Sara', slackId: null }
const TAGGED_SARA = { name: 'Sara', slackId: 'U0SARA' }

describe('message formatting', () => {
  test('marked (no slack id falls back to name)', () => {
    expect(absenceMarkedMessage(SARA, '2026-07-24', 'travel'))
      .toBe("🚫 Sara won't be available Friday, Jul 24 — travel")
  })
  test('marked tags the member when slack id is known', () => {
    expect(absenceMarkedMessage(TAGGED_SARA, '2026-07-24', 'travel'))
      .toBe("🚫 <@U0SARA> won't be available Friday, Jul 24 — travel")
  })
  test('updated', () => {
    expect(absenceUpdatedMessage(TAGGED_SARA, '2026-07-24', 'sick'))
      .toBe("✏️ <@U0SARA>'s absence on Friday, Jul 24 updated — sick")
  })
  test('cancelled', () => {
    expect(absenceCancelledMessage(TAGGED_SARA, '2026-07-24'))
      .toBe('✅ <@U0SARA> is now available Friday, Jul 24')
  })
  test('reminder with nobody out', () => {
    expect(dailyReminderMessage([])).toBe("⏰ Shared hour today — everyone's in!")
  })
  test('reminder tags people who are out', () => {
    expect(dailyReminderMessage([
      { name: 'Sara', slackId: 'U0SARA', reason: 'travel' },
      { name: 'Ali', slackId: null, reason: 'sick' },
    ])).toBe('⏰ Shared hour today — out: <@U0SARA> (travel), Ali (sick)')
  })
  test('escapes user text in the daily reminder', () => {
    expect(dailyReminderMessage([{ name: '<Sara>', slackId: null, reason: 'a & b' }]))
      .toBe('⏰ Shared hour today — out: &lt;Sara&gt; (a &amp; b)')
  })
  test('weekend signup with note and invite fallback name', () => {
    expect(signupMessage(SARA, '2026-07-25', 'shipping the demo', [{ name: 'Ali', slackId: null }]))
      .toBe('🙋 Sara is in for the shared hour Saturday, Jul 25 — shipping the demo · asking Ali to join')
  })
  test('weekend signup tags member and multiple invitees', () => {
    expect(signupMessage(TAGGED_SARA, '2026-07-25', '', [
      { name: 'Ali', slackId: 'U0ALI' },
      { name: 'Omar', slackId: null },
    ])).toBe('🙋 <@U0SARA> is in for the shared hour Saturday, Jul 25 · asking <@U0ALI>, Omar to join')
  })
  test('weekend signup without note or invites', () => {
    expect(signupMessage(SARA, '2026-07-25', '', []))
      .toBe('🙋 Sara is in for the shared hour Saturday, Jul 25')
  })
  test('signup cancelled', () => {
    expect(signupCancelledMessage(TAGGED_SARA, '2026-07-25'))
      .toBe('✋ <@U0SARA> pulled out of Saturday, Jul 25')
  })
  test('invite accepted tags both people', () => {
    expect(inviteAcceptedMessage(TAGGED_SARA, { name: 'Ali', slackId: 'U0ALI' }, '2026-07-25'))
      .toBe('✅ <@U0SARA> is in — joining <@U0ALI> Saturday, Jul 25')
  })
  test('invite declined tags the person', () => {
    expect(inviteDeclinedMessage(TAGGED_SARA, '2026-07-25'))
      .toBe("✋ <@U0SARA> can't make Saturday, Jul 25")
  })
  test('weekend reminder tags who is in', () => {
    expect(weekendReminderMessage([
      { name: 'Sara', slackId: 'U0SARA', note: 'demo' },
      { name: 'Ali', slackId: null, note: '' },
    ])).toBe('⏰ Weekend shared hour today — in: <@U0SARA> (demo), Ali')
  })
  test('weekend signup escapes user text', () => {
    expect(signupMessage({ name: '<Sara>', slackId: null }, '2026-07-25', 'a & b', [{ name: '<Ali>', slackId: null }]))
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
  test('strips BOM and whitespace from the webhook url', async () => {
    vi.stubEnv('SLACK_WEBHOOK_URL', '﻿ https://hooks.slack.example/x \n')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    expect(await sendSlackMessage('hello')).toBe(true)
    expect(fetchMock.mock.calls[0][0]).toBe('https://hooks.slack.example/x')
  })
})
