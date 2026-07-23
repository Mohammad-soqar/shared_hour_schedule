import Link from 'next/link'

interface WeekNavProps {
  offset: number
  maxWeeks: number
}

export function WeekNav({ offset, maxWeeks }: WeekNavProps) {
  return (
    <nav className="flex items-center gap-2 text-sm">
      <Link
        href={`/?week=${offset - 1}`}
        aria-disabled={offset <= 0}
        className={`rounded-lg border border-slate-300 px-3 py-1.5 ${
          offset <= 0 ? 'pointer-events-none opacity-40' : 'hover:bg-slate-100'
        }`}
      >
        ← Previous
      </Link>
      <span className="px-2 font-medium text-slate-700">
        {offset === 0 ? 'This week' : offset === 1 ? 'Next week' : `In ${offset} weeks`}
      </span>
      <Link
        href={`/?week=${offset + 1}`}
        aria-disabled={offset >= maxWeeks}
        className={`rounded-lg border border-slate-300 px-3 py-1.5 ${
          offset >= maxWeeks ? 'pointer-events-none opacity-40' : 'hover:bg-slate-100'
        }`}
      >
        Next →
      </Link>
    </nav>
  )
}
