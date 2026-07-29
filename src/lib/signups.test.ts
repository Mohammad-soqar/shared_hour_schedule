import { describe, expect, test } from 'vitest'
import {
  deleteSignup, listMembers, listMyInvites, listRecentSignupActivity, listSignups,
  respondToInvite, upsertSignup,
} from './signups'
import { fakeDb } from './testFakeDb'

const OK = { data: null, error: null }

describe('upsertSignup', () => {
  const row = { id: 's1', email: 'sara@x.com', date: '2026-07-25', note: 'demo' }
  test('creates when none exists (wasUpdate false)', async () => {
    // queue: find existing, upsert signup, delete stale invites
    const db = fakeDb({ data: null, error: null }, { data: row, error: null }, OK)
    expect(await upsertSignup(db, 'sara@x.com', '2026-07-25', 'demo', []))
      .toEqual({ signup: row, wasUpdate: false })
  })
  test('updates and syncs invites (wasUpdate true)', async () => {
    // queue: find existing, upsert signup, delete stale invites, upsert invites
    const db = fakeDb({ data: { id: 's1' }, error: null }, { data: row, error: null }, OK, OK)
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
  test('flattens member info and keeps invites with statuses', async () => {
    const db = fakeDb({
      data: [{
        id: 's1', email: 'sara@x.com', date: '2026-07-25', note: 'demo',
        member: { display_name: 'Sara', team: 'design', slack_id: 'U0SARA' },
        invites: [{ email: 'ali@x.com', status: 'accepted' }, { email: 'omar@x.com', status: 'pending' }],
      }],
      error: null,
    })
    expect(await listSignups(db, '2026-07-20', '2026-07-26')).toEqual([{
      id: 's1', email: 'sara@x.com', date: '2026-07-25', note: 'demo',
      display_name: 'Sara', team: 'design', slack_id: 'U0SARA',
      invites: [{ email: 'ali@x.com', status: 'accepted' }, { email: 'omar@x.com', status: 'pending' }],
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
        id: 's1', email: 'sara@x.com', date: '2026-07-25', note: 'demo',
        created_at: '2026-07-20T08:00:00Z', updated_at: '2026-07-20T08:00:00Z',
        member: { display_name: 'Sara', team: 'core', slack_id: null }, invites: null,
      }],
      error: null,
    })
    expect(await listRecentSignupActivity(db, 8)).toEqual([{
      id: 's1', email: 'sara@x.com', date: '2026-07-25', note: 'demo',
      created_at: '2026-07-20T08:00:00Z', updated_at: '2026-07-20T08:00:00Z',
      display_name: 'Sara', team: 'core', slack_id: null, invites: [],
    }])
  })
})

describe('listMyInvites', () => {
  test('returns pending future invites sorted by date', async () => {
    const db = fakeDb({
      data: [
        { id: 'i2', status: 'pending', signup: { date: '2026-08-02', note: '', member: { display_name: 'Omar', slack_id: null } } },
        { id: 'i1', status: 'pending', signup: { date: '2026-08-01', note: 'demo', member: { display_name: 'Sara', slack_id: 'U0SARA' } } },
        { id: 'i0', status: 'pending', signup: { date: '2026-07-19', note: 'past', member: { display_name: 'Ali', slack_id: null } } },
      ],
      error: null,
    })
    expect(await listMyInvites(db, 'me@x.com', '2026-07-23')).toEqual([
      { id: 'i1', date: '2026-08-01', note: 'demo', inviter_name: 'Sara' },
      { id: 'i2', date: '2026-08-02', note: '', inviter_name: 'Omar' },
    ])
  })
})

describe('respondToInvite', () => {
  test('returns inviter info on success', async () => {
    const db = fakeDb({
      data: { id: 'i1', status: 'accepted', signup: { date: '2026-08-01', note: '', member: { display_name: 'Sara', slack_id: 'U0SARA' } } },
      error: null,
    })
    expect(await respondToInvite(db, 'me@x.com', 'i1', 'accepted')).toEqual({
      id: 'i1', date: '2026-08-01', inviter_name: 'Sara', inviter_slack_id: 'U0SARA',
    })
  })
  test('returns null when invite not found or already answered', async () => {
    expect(await respondToInvite(fakeDb({ data: null, error: null }), 'me@x.com', 'i9', 'declined')).toBeNull()
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
