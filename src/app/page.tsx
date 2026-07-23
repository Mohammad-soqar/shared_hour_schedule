import { redirect } from 'next/navigation'
import { listAbsences } from '@/lib/absences'
import { getCurrentMember } from '@/lib/currentUser'
import { formatHuman, todayInRiyadh, weekdaysOfWeek } from '@/lib/dates'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { AbsenceCard } from './components/AbsenceCard'
import { AbsenceForm } from './components/AbsenceForm'
import { WeekNav } from './components/WeekNav'

export const dynamic = 'force-dynamic'

const MAX_WEEKS_AHEAD = 8

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const member = await getCurrentMember()
  if (!member) redirect('/login')

  const { week } = await searchParams
  const offset = Math.min(Math.max(Number(week) || 0, 0), MAX_WEEKS_AHEAD)
  const today = todayInRiyadh()
  const days = weekdaysOfWeek(today, offset)
  const absences = await listAbsences(createAdminSupabase(), days[0], days[days.length - 1])

  return (
    <main className="mx-auto w-full max-w-6xl p-4 sm:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Shared Hour</h1>
          <p className="text-sm text-slate-500">Signed in as {member.display_name}</p>
        </div>
        <div className="flex items-center gap-3">
          <AbsenceForm today={today} />
          <form action="/api/auth/signout" method="post">
            <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <WeekNav offset={offset} maxWeeks={MAX_WEEKS_AHEAD} />

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {days.map((day) => {
          const dayAbsences = absences.filter((a) => a.date === day)
          const isToday = day === today
          const isPast = day < today
          return (
            <section
              key={day}
              className={`rounded-2xl border bg-white p-3 ${
                isToday ? 'border-slate-900' : 'border-slate-200'
              } ${isPast ? 'opacity-50' : ''}`}
            >
              <h2 className="text-sm font-semibold text-slate-900">
                {formatHuman(day)}
                {isToday && (
                  <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white">today</span>
                )}
              </h2>
              <div className="mt-2 space-y-2">
                {dayAbsences.length === 0 ? (
                  <p className="text-xs text-slate-400">Everyone&apos;s in 🎉</p>
                ) : (
                  dayAbsences.map((a) => (
                    <AbsenceCard
                      key={a.id}
                      absence={a}
                      isOwn={a.email === member.email}
                      isPast={isPast}
                      today={today}
                    />
                  ))
                )}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
