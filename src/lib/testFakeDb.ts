import type { Db } from './absences'

export type FakeResult = { data: unknown; error: { message: string } | null }

// Chainable stub of the supabase query builder: every chain method returns the
// builder; terminal calls (single/maybeSingle/await) consume queued results.
export function fakeDb(...results: FakeResult[]): Db {
  let i = 0
  const next = () => results[i++]
  const builder: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'gte', 'lte', 'order', 'upsert', 'delete', 'insert', 'limit']) {
    builder[m] = () => builder
  }
  builder.maybeSingle = () => Promise.resolve(next())
  builder.single = () => Promise.resolve(next())
  builder.then = (resolve: (r: FakeResult) => unknown) => Promise.resolve(next()).then(resolve)
  return { from: () => builder } as unknown as Db
}
