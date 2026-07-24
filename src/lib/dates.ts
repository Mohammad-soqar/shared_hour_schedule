const RIYADH_TZ = 'Asia/Riyadh'
const DAYS_PER_WEEK = 7
const WEEKDAYS_SHOWN = 5

// Absences beyond this window would be invisible on the board (page.tsx clamps
// week navigation to the same bound), so validation rejects them too.
export const MAX_WEEKS_AHEAD = 8

export function todayInRiyadh(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: RIYADH_TZ }).format(new Date())
}

function toUtcDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`)
}

export function isValidDateString(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const parsed = toUtcDate(date)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
}

export function isWeekend(date: string): boolean {
  const day = toUtcDate(date).getUTCDay()
  return day === 6 || day === 0
}

export function isPastDate(date: string, today: string): boolean {
  return date < today
}

function weekFromMonday(today: string, offsetWeeks: number, length: number): string[] {
  const base = toUtcDate(today)
  const daysSinceMonday = (base.getUTCDay() + 6) % DAYS_PER_WEEK
  const monday = new Date(base)
  monday.setUTCDate(base.getUTCDate() - daysSinceMonday + offsetWeeks * DAYS_PER_WEEK)
  return Array.from({ length }, (_, i) => {
    const d = new Date(monday)
    d.setUTCDate(monday.getUTCDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

export function weekdaysOfWeek(today: string, offsetWeeks: number): string[] {
  return weekFromMonday(today, offsetWeeks, WEEKDAYS_SHOWN)
}

export function daysOfWeek(today: string, offsetWeeks: number): string[] {
  return weekFromMonday(today, offsetWeeks, DAYS_PER_WEEK)
}

export function lastSelectableDate(today: string): string {
  const lastWeek = daysOfWeek(today, MAX_WEEKS_AHEAD)
  return lastWeek[lastWeek.length - 1]
}

export function formatHuman(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC',
  }).format(toUtcDate(date))
}

export function formatMonthDay(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  }).format(toUtcDate(date)).toUpperCase()
}

export function formatWeekdayShort(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short', timeZone: 'UTC',
  }).format(toUtcDate(date)).toUpperCase()
}
