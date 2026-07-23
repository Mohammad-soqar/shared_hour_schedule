import type { SupabaseClient } from '@supabase/supabase-js'

export type Db = SupabaseClient
export type AbsenceRecord = { id: string; email: string; date: string; reason: string }
export type Member = { email: string; display_name: string }

export async function checkAllowed(db: Db, email: string): Promise<Member | null> {
  const { data, error } = await db
    .from('allowed_members')
    .select('email, display_name')
    .eq('email', email.toLowerCase())
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function upsertAbsence(
  db: Db, email: string, date: string, reason: string,
): Promise<{ absence: AbsenceRecord; wasUpdate: boolean }> {
  const { data: existing, error: findError } = await db
    .from('absences').select('id').eq('email', email).eq('date', date).maybeSingle()
  if (findError) throw new Error(findError.message)

  const { data, error } = await db
    .from('absences')
    .upsert(
      { email, date, reason, updated_at: new Date().toISOString() },
      { onConflict: 'email,date' },
    )
    .select('id, email, date, reason')
    .single()
  if (error) throw new Error(error.message)
  return { absence: data as AbsenceRecord, wasUpdate: existing !== null }
}

export async function deleteAbsence(
  db: Db, email: string, id: string,
): Promise<{ id: string; date: string } | null> {
  const { data, error } = await db
    .from('absences').delete().eq('id', id).eq('email', email)
    .select('id, date').maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export type ActivityRecord = AbsenceRecord & {
  created_at: string
  updated_at: string
  display_name: string
}

export async function listRecentActivity(db: Db, limit: number): Promise<ActivityRecord[]> {
  const { data, error } = await db
    .from('absences')
    .select('id, email, date, reason, created_at, updated_at, allowed_members(display_name)')
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  type Row = Omit<ActivityRecord, 'display_name'> & { allowed_members: { display_name: string } | null }
  return ((data ?? []) as unknown as Row[]).map(({ allowed_members, ...rest }) => ({
    ...rest,
    display_name: allowed_members?.display_name ?? rest.email,
  }))
}

export async function listAbsences(
  db: Db, from: string, to: string,
): Promise<Array<AbsenceRecord & { display_name: string }>> {
  const { data, error } = await db
    .from('absences')
    .select('id, email, date, reason, allowed_members(display_name)')
    .gte('date', from)
    .lte('date', to)
    .order('date')
  if (error) throw new Error(error.message)
  type Row = AbsenceRecord & { allowed_members: { display_name: string } | null }
  return ((data ?? []) as unknown as Row[]).map(({ allowed_members, ...rest }) => ({
    ...rest,
    display_name: allowed_members?.display_name ?? rest.email,
  }))
}
