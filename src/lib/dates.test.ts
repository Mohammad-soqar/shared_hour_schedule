import { describe, expect, test } from 'vitest'
import { formatHuman, isPastDate, isValidDateString, isWeekend, todayInRiyadh, weekdaysOfWeek } from './dates'

describe('todayInRiyadh', () => {
  test('returns a YYYY-MM-DD string', () => {
    expect(todayInRiyadh()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('isWeekend', () => {
  test('Saturday is weekend', () => expect(isWeekend('2026-07-25')).toBe(true))
  test('Sunday is weekend', () => expect(isWeekend('2026-07-26')).toBe(true))
  test('Friday is not weekend', () => expect(isWeekend('2026-07-24')).toBe(false))
  test('Monday is not weekend', () => expect(isWeekend('2026-07-27')).toBe(false))
})

describe('isPastDate', () => {
  test('yesterday is past', () => expect(isPastDate('2026-07-22', '2026-07-23')).toBe(true))
  test('today is not past', () => expect(isPastDate('2026-07-23', '2026-07-23')).toBe(false))
  test('tomorrow is not past', () => expect(isPastDate('2026-07-24', '2026-07-23')).toBe(false))
})

describe('isValidDateString', () => {
  test('accepts real date', () => expect(isValidDateString('2026-07-23')).toBe(true))
  test('rejects garbage', () => expect(isValidDateString('not-a-date')).toBe(false))
  test('rejects impossible date', () => expect(isValidDateString('2026-02-30')).toBe(false))
})

describe('weekdaysOfWeek', () => {
  test('returns Mon-Fri of current week for a Thursday', () => {
    expect(weekdaysOfWeek('2026-07-23', 0)).toEqual([
      '2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24',
    ])
  })
  test('offset 1 returns next week', () => {
    expect(weekdaysOfWeek('2026-07-23', 1)[0]).toBe('2026-07-27')
  })
  test('works when today is Sunday (start of JS week)', () => {
    expect(weekdaysOfWeek('2026-07-26', 0)[0]).toBe('2026-07-20')
  })
})

describe('formatHuman', () => {
  test('formats as weekday + short month + day', () => {
    expect(formatHuman('2026-07-24')).toBe('Friday, Jul 24')
  })
})
