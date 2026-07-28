import type { Db, Member } from './absences'

export type SignupRecord = {
  id: string
  email: string
  date: string
  note: string
  invited_emails: string[]
}

export type SignupView = SignupRecord & {
  display_name: string
  team: string
  slack_id: string | null
}
export type SignupActivityRecord = SignupView & { created_at: string; updated_at: string }

// The FK relationship name is explicit so the join survives schema changes.
const SIGNUP_SELECT = 'id, email, date, note, invited_emails, ' +
  'member:allowed_members!signups_email_fkey(display_name, team, slack_id)'

type JoinedRow = SignupRecord & {
  created_at?: string
  updated_at?: string
  member: { display_name: string; team: string; slack_id: string | null } | null
}

function flatten(row: JoinedRow): SignupView & { created_at?: string; updated_at?: string } {
  const { member, ...rest } = row
  return {
    ...rest,
    display_name: member?.display_name ?? rest.email,
    team: member?.team ?? 'core',
    slack_id: member?.slack_id ?? null,
  }
}

export async function upsertSignup(
  db: Db, email: string, date: string, note: string, invitedEmails: string[],
): Promise<{ signup: SignupRecord; wasUpdate: boolean }> {
  const { data: existing, error: findError } = await db
    .from('signups').select('id').eq('email', email).eq('date', date).maybeSingle()
  if (findError) throw new Error(findError.message)

  const { data, error } = await db
    .from('signups')
    .upsert(
      { email, date, note, invited_emails: invitedEmails, updated_at: new Date().toISOString() },
      { onConflict: 'email,date' },
    )
    .select('id, email, date, note, invited_emails')
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
    .select('email, display_name, team, slack_id')
    .order('display_name')
  if (error) throw new Error(error.message)
  return (data ?? []) as Member[]
}
