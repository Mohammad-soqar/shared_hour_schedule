import { describe, expect, test } from 'vitest'
import { checkAllowed, deleteAbsence, listAbsences, upsertAbsence, type Db } from './absences'

type Result = { data: unknown; error: { message: string } | null }

function fakeDb(...results: Result[]): Db {
  let i = 0
  const next = () => results[i++]
  const builder: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'gte', 'lte', 'order', 'upsert', 'delete', 'insert']) {
    builder[m] = () => builder
  }
  builder.maybeSingle = () => Promise.resolve(next())
  builder.single = () => Promise.resolve(next())
  builder.then = (resolve: (r: Result) => unknown) => Promise.resolve(next()).then(resolve)
  return { from: () => builder } as unknown as Db
}

describe('checkAllowed', () => {
  test('returns member when allowlisted', async () => {
    const member = { email: 'sara@x.com', display_name: 'Sara' }
    expect(await checkAllowed(fakeDb({ data: member, error: null }), 'Sara@X.com')).toEqual(member)
  })
  test('returns null when not allowlisted', async () => {
    expect(await checkAllowed(fakeDb({ data: null, error: null }), 'no@x.com')).toBeNull()
  })
  test('throws on db error', async () => {
    await expect(checkAllowed(fakeDb({ data: null, error: { message: 'boom' } }), 'a@x.com'))
      .rejects.toThrow('boom')
  })
})

describe('upsertAbsence', () => {
  const row = { id: 'u1', email: 'sara@x.com', date: '2026-07-24', reason: 'travel' }
  test('creates when none exists (wasUpdate false)', async () => {
    const db = fakeDb({ data: null, error: null }, { data: row, error: null })
    expect(await upsertAbsence(db, 'sara@x.com', '2026-07-24', 'travel'))
      .toEqual({ absence: row, wasUpdate: false })
  })
  test('updates when one exists (wasUpdate true)', async () => {
    const db = fakeDb({ data: { id: 'u1' }, error: null }, { data: row, error: null })
    expect((await upsertAbsence(db, 'sara@x.com', '2026-07-24', 'travel')).wasUpdate).toBe(true)
  })
  test('throws on db error', async () => {
    const db = fakeDb({ data: null, error: null }, { data: null, error: { message: 'nope' } })
    await expect(upsertAbsence(db, 'sara@x.com', '2026-07-24', 'x')).rejects.toThrow('nope')
  })
})

describe('deleteAbsence', () => {
  test('returns deleted row', async () => {
    const db = fakeDb({ data: { id: 'u1', date: '2026-07-24' }, error: null })
    expect(await deleteAbsence(db, 'sara@x.com', 'u1')).toEqual({ id: 'u1', date: '2026-07-24' })
  })
  test('returns null when not found / not owner', async () => {
    expect(await deleteAbsence(fakeDb({ data: null, error: null }), 'sara@x.com', 'u9')).toBeNull()
  })
})

describe('listAbsences', () => {
  test('flattens joined display_name', async () => {
    const db = fakeDb({
      data: [{ id: 'u1', email: 'sara@x.com', date: '2026-07-24', reason: 'travel', allowed_members: { display_name: 'Sara' } }],
      error: null,
    })
    expect(await listAbsences(db, '2026-07-20', '2026-07-24')).toEqual([
      { id: 'u1', email: 'sara@x.com', date: '2026-07-24', reason: 'travel', display_name: 'Sara' },
    ])
  })
  test('throws on db error', async () => {
    await expect(listAbsences(fakeDb({ data: null, error: { message: 'bad' } }), 'a', 'b'))
      .rejects.toThrow('bad')
  })
})
