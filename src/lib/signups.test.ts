import { describe, expect, test } from 'vitest'
import { deleteSignup, listMembers, listRecentSignupActivity, listSignups, upsertSignup } from './signups'
import { fakeDb } from './testFakeDb'

describe('upsertSignup', () => {
  const row = { id: 's1', email: 'sara@x.com', date: '2026-07-25', note: 'demo', invited_email: null }
  test('creates when none exists (wasUpdate false)', async () => {
    const db = fakeDb({ data: null, error: null }, { data: row, error: null })
    expect(await upsertSignup(db, 'sara@x.com', '2026-07-25', 'demo', null))
      .toEqual({ signup: row, wasUpdate: false })
  })
  test('updates when one exists (wasUpdate true)', async () => {
    const db = fakeDb({ data: { id: 's1' }, error: null }, { data: row, error: null })
    expect((await upsertSignup(db, 'sara@x.com', '2026-07-25', 'demo', 'ali@x.com')).wasUpdate).toBe(true)
  })
  test('throws on db error', async () => {
    const db = fakeDb({ data: null, error: null }, { data: null, error: { message: 'nope' } })
    await expect(upsertSignup(db, 'sara@x.com', '2026-07-25', '', null)).rejects.toThrow('nope')
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
  test('flattens member and invited display names', async () => {
    const db = fakeDb({
      data: [{
        id: 's1', email: 'sara@x.com', date: '2026-07-25', note: 'demo', invited_email: 'ali@x.com',
        member: { display_name: 'Sara' }, invited: { display_name: 'Ali' },
      }],
      error: null,
    })
    expect(await listSignups(db, '2026-07-20', '2026-07-26')).toEqual([{
      id: 's1', email: 'sara@x.com', date: '2026-07-25', note: 'demo',
      invited_email: 'ali@x.com', display_name: 'Sara', invited_name: 'Ali',
    }])
  })
  test('handles missing invite', async () => {
    const db = fakeDb({
      data: [{
        id: 's2', email: 'sara@x.com', date: '2026-07-26', note: '', invited_email: null,
        member: { display_name: 'Sara' }, invited: null,
      }],
      error: null,
    })
    expect((await listSignups(db, 'a', 'b'))[0].invited_name).toBeNull()
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
        id: 's1', email: 'sara@x.com', date: '2026-07-25', note: 'demo', invited_email: null,
        created_at: '2026-07-20T08:00:00Z', updated_at: '2026-07-20T08:00:00Z',
        member: { display_name: 'Sara' }, invited: null,
      }],
      error: null,
    })
    expect(await listRecentSignupActivity(db, 8)).toEqual([{
      id: 's1', email: 'sara@x.com', date: '2026-07-25', note: 'demo', invited_email: null,
      created_at: '2026-07-20T08:00:00Z', updated_at: '2026-07-20T08:00:00Z',
      display_name: 'Sara', invited_name: null,
    }])
  })
})

describe('listMembers', () => {
  test('returns roster', async () => {
    const roster = [{ email: 'sara@x.com', display_name: 'Sara' }]
    expect(await listMembers(fakeDb({ data: roster, error: null }))).toEqual(roster)
  })
  test('throws on db error', async () => {
    await expect(listMembers(fakeDb({ data: null, error: { message: 'bad' } }))).rejects.toThrow('bad')
  })
})
