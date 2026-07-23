import { checkAllowed, type Member } from '@/lib/absences'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase/server'

export async function getCurrentMember(): Promise<Member | null> {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null
  return checkAllowed(createAdminSupabase(), user.email)
}
