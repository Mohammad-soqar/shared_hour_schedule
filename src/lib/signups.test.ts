import { describe, expect, test } from 'vitest'
import { deleteSignup, listMembers, listRecentSignupActivity, listSignups, upsertSignup } from './signups'
import { fakeDb } from './testFakeDb'

describe('upsertSignup', () => {
  const row = { id: 's1', email: 'sara@x.com', date: '2026-07-25', note: 'demo', invited_emails: [] }
  test('creates when none exists (wasUpdate false)', async () => {
    const db = fakeDb({ data: null, error: null }, { data: row, error: null })
    expect(await upsertSignup(db, 'sara@x.com', '2026-07-25', 'demo', []))
      .toEqual({ signup: row, wasUpdate: false })
  })
  test('updates when one exists (wasUpdate true)', async () => {
    const db = fakeDb({ data: { id: 's1' }, error: null }, { data: row, error: null })
    expect((await upsertSignup(db, 'sara@x.com', '2026-07-25', 'demo', ['ali@x.com', 'omar@x.com'])).wasUpdate).toBe(true)
  })
  test('throws on db error', async () => {
    const db = fakeDb({ data: null, error: null }, { data: null, error: { message: 'nope' } })
    await expect(upsertSignup(db, 'sara@x.com', '2026-07-25', '', [])).rejects.toThrow('nope')
  })
})

describe('deleteSignup', () => {
  test('returns deleted row', async () => {
    const db = fakeDb({ data: { id: 's1', date: '2026-07-25' }, error: null })
    expect(await deleteSignup(db, 'sara@x.com', 's1')).toEqual({ id: 's1', date: '2026-07-25' })
  })
  test('returns null when not found / not owner', async () => {
    expect(await deleteSignup(fakeDb({ data: null, error: null }), 'sara@x.com', 's9')).toBeNull()
  })
})

describe('listSignups', () => {
  test('flattens member info and keeps invited emails', async () => {
    const db = fakeDb({
      data: [{
        id: 's1', email: 'sara@x.com', date: '2026-07-25', note: 'demo',
        invited_emails: ['ali@x.com', 'omar@x.com'],
        member: { display_name: 'Sara', team: 'design', slack_id: 'U0SARA' },
      }],
      error: null,
    })
    expect(await listSignups(db, '2026-07-20', '2026-07-26')).toEqual([{
      id: 's1', email: 'sara@x.com', date: '2026-07-25', note: 'demo',
      invited_emails: ['ali@x.com', 'omar@x.com'],
      display_name: 'Sara', team: 'design', slack_id: 'U0SARA',
    }])
  })
  test('throws on db error', async () => {
    await expect(listSignups(fakeDb({ data: null, error: { message: 'bad' } }), 'a', 'b'))
      .rejects.toThrow('bad')
  })
})

describe('listRecentSignupActivity', () => {
  test('returns flattened rows with timestamps', async () => {
    const db = fakeDb({
      data: [{
        id: 's1', email: 'sara@x.com', date: '2026-07-25', note: 'demo', invited_emails: [],
        created_at: '2026-07-20T08:00:00Z', updated_at: '2026-07-20T08:00:00Z',
        member: { display_name: 'Sara', team: 'core', slack_id: null },
      }],
      error: null,
    })
    expect(await listRecentSignupActivity(db, 8)).toEqual([{
      id: 's1', email: 'sara@x.com', date: '2026-07-25', note: 'demo', invited_emails: [],
      created_at: '2026-07-20T08:00:00Z', updated_at: '2026-07-20T08:00:00Z',
      display_name: 'Sara', team: 'core', slack_id: null,
    }])
  })
})

describe('listMembers', () => {
  test('returns roster', async () => {
    const roster = [{ email: 'sara@x.com', display_name: 'Sara', team: 'core', slack_id: null }]
    expect(await listMembers(fakeDb({ data: roster, error: null }))).toEqual(roster)
  })
  test('throws on db error', async () => {
    await expect(listMembers(fakeDb({ data: null, error: { message: 'bad' } }))).rejects.toThrow('bad')
  })
})
