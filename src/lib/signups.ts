import type { Db, Member } from './absences'

export type InviteStatus = 'pending' | 'accepted' | 'declined'
export type InviteEntry = { email: string; status: InviteStatus }

export type SignupRecord = {
  id: string
  email: string
  date: string
  note: string
}

export type SignupView = SignupRecord & {
  display_name: string
  team: string
  slack_id: string | null
  invites: InviteEntry[]
}
export type SignupActivityRecord = SignupView & { created_at: string; updated_at: string }

export type MyInvite = {
  id: string
  date: string
  note: string
  inviter_name: string
}

export type InviteResponse = {
  id: string
  date: string
  inviter_name: string
  inviter_slack_id: string | null
}

// The FK relationship name is explicit so the join survives schema changes.
const SIGNUP_SELECT = 'id, email, date, note, ' +
  'member:allowed_members!signups_email_fkey(display_name, team, slack_id), ' +
  'invites:signup_invites(email, status)'

type JoinedRow = SignupRecord & {
  created_at?: string
  updated_at?: string
  member: { display_name: string; team: string; slack_id: string | null } | null
  invites: InviteEntry[] | null
}

function flatten(row: JoinedRow): SignupView & { created_at?: string; updated_at?: string } {
  const { member, invites, ...rest } = row
  return {
    ...rest,
    display_name: member?.display_name ?? rest.email,
    team: member?.team ?? 'core',
    slack_id: member?.slack_id ?? null,
    invites: invites ?? [],
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
      { email, date, note, updated_at: new Date().toISOString() },
      { onConflict: 'email,date' },
    )
    .select('id, email, date, note')
    .single()
  if (error) throw new Error(error.message)
  const signup = data as SignupRecord

  // Sync invites: drop uninvited, add new as pending, keep existing statuses.
  const removal = db.from('signup_invites').delete().eq('signup_id', signup.id)
  const { error: removeError } = await (invitedEmails.length > 0
    ? removal.not('email', 'in', `(${invitedEmails.join(',')})`)
    : removal)
  if (removeError) throw new Error(removeError.message)

  if (invitedEmails.length > 0) {
    const { error: inviteError } = await db
      .from('signup_invites')
      .upsert(
        invitedEmails.map((invited) => ({ signup_id: signup.id, email: invited })),
        { onConflict: 'signup_id,email', ignoreDuplicates: true },
      )
    if (inviteError) throw new Error(inviteError.message)
  }
  return { signup, wasUpdate: existing !== null }
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

type InviteJoinRow = {
  id: string
  status: InviteStatus
  signup: {
    date: string
    note: string
    member: { display_name: string; slack_id: string | null } | null
  } | null
}

export async function listMyInvites(db: Db, email: string, today: string): Promise<MyInvite[]> {
  const { data, error } = await db
    .from('signup_invites')
    .select('id, status, signup:signups(date, note, member:allowed_members!signups_email_fkey(display_name, slack_id))')
    .eq('email', email)
    .eq('status', 'pending')
  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as InviteJoinRow[])
    .filter((row) => row.signup !== null && row.signup.date >= today)
    .map((row) => ({
      id: row.id,
      date: row.signup!.date,
      note: row.signup!.note,
      inviter_name: row.signup!.member?.display_name ?? 'A teammate',
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function respondToInvite(
  db: Db, email: string, inviteId: string, status: 'accepted' | 'declined',
): Promise<InviteResponse | null> {
  const { data, error } = await db
    .from('signup_invites')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', inviteId)
    .eq('email', email)
    .eq('status', 'pending')
    .select('id, status, signup:signups(date, note, member:allowed_members!signups_email_fkey(display_name, slack_id))')
    .maybeSingle()
  if (error) throw new Error(error.message)
  const row = data as unknown as InviteJoinRow | null
  if (!row?.signup) return null
  return {
    id: row.id,
    date: row.signup.date,
    inviter_name: row.signup.member?.display_name ?? 'A teammate',
    inviter_slack_id: row.signup.member?.slack_id ?? null,
  }
}

export async function listMembers(db: Db): Promise<Member[]> {
  const { data, error } = await db
    .from('allowed_members')
    .select('email, display_name, team, slack_id')
    .order('display_name')
  if (error) throw new Error(error.message)
  return (data ?? []) as Member[]
}
