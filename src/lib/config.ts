const DEFAULT_HOUR_START = 14

function parseHour(raw: string | undefined): number | null {
  if (!raw) return null
  const n = Number(raw)
  return Number.isInteger(n) && n >= 0 && n <= 23 ? n : null
}

// When the shared hour starts (24h clock, Asia/Riyadh).
// NEXT_PUBLIC_ so both server and client see it; set in .env.local / Vercel.
export const SHARED_HOUR_START =
  parseHour(process.env.NEXT_PUBLIC_SHARED_HOUR_START) ?? DEFAULT_HOUR_START

// The design team runs its hour at a different time; until the env var is
// set, they share the core hour.
export const DESIGN_HOUR_START =
  parseHour(process.env.NEXT_PUBLIC_DESIGN_HOUR_START) ?? SHARED_HOUR_START

export function teamHourStart(team: string): number {
  return team === 'design' ? DESIGN_HOUR_START : SHARED_HOUR_START
}

export function teamLabel(team: string): string {
  return team === 'design' ? 'DESIGN TEAM' : 'CORE TEAM'
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function hourRangeLabel(start: number = SHARED_HOUR_START): string {
  return `${pad2(start)}:00 – ${pad2((start + 1) % 24)}:00`
}
