import type { Db, Member } from './absences'

export type SignupRecord = {
  id: string
  email: string
  date: string
  note: string
  invited_email: string | null
}

export type SignupView = SignupRecord & { display_name: string; invited_name: string | null }
export type SignupActivityRecord = SignupView & { created_at: string; updated_at: string }

// Two FKs into allowed_members, so the joins need explicit relationship names.
const SIGNUP_SELECT = 'id, email, date, note, invited_email, ' +
  'member:allowed_members!signups_email_fkey(display_name), ' +
  'invited:allowed_members!signups_invited_email_fkey(display_name)'

type JoinedRow = SignupRecord & {
  created_at?: string
  updated_at?: string
  member: { display_name: string } | null
  invited: { display_name: string } | null
}

function flatten(row: JoinedRow): SignupView & { created_at?: string; updated_at?: string } {
  const { member, invited, ...rest } = row
  return {
    ...rest,
    display_name: member?.display_name ?? rest.email,
    invited_name: invited?.display_name ?? null,
  }
}

export async function upsertSignup(
  db: Db, email: string, date: string, note: string, invitedEmail: string | null,
): Promise<{ signup: SignupRecord; wasUpdate: boolean }> {
  const { data: existing, error: findError } = await db
    .from('signups').select('id').eq('email', email).eq('date', date).maybeSingle()
  if (findError) throw new Error(findError.message)

  const { data, error } = await db
    .from('signups')
    .upsert(
      { email, date, note, invited_email: invitedEmail, updated_at: new Date().toISOString() },
      { onConflict: 'email,date' },
    )
    .select('id, email, date, note, invited_email')
    .single()
  if (error) throw new Error(error.message)
  return { signup: data as SignupRecord, wasUpdate: existing !== null }
}

export async function deleteSignup(
  db: Db, email: string, id: string,
): Promise<{ id: string; date: string } | null> {
  const { data, error } = await db
    .from('signups').delete().eq('id', id).eq('email', email)
    .select('id, date').maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function listSignups(db: Db, from: string, to: string): Promise<SignupView[]> {
  const { data, error } = await db
    .from('signups')
    .select(SIGNUP_SELECT)
    .gte('date', from)
    .lte('date', to)
    .order('date')
  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as JoinedRow[]).map(flatten)
}

export async function listRecentSignupActivity(db: Db, limit: number): Promise<SignupActivityRecord[]> {
  const { data, error } = await db
    .from('signups')
    .select(`${SIGNUP_SELECT}, created_at, updated_at`)
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as JoinedRow[]).map(flatten) as SignupActivityRecord[]
}

export async function listMembers(db: Db): Promise<Member[]> {
  const { data, error } = await db
    .from('allowed_members')
    .select('email, display_name')
    .order('display_name')
  if (error) throw new Error(error.message)
  return (data ?? []) as Member[]
}
