import { describe, expect, test } from 'vitest'
import { validateAbsenceInput } from './validation'

const TODAY = '2026-07-23' // Thursday

describe('validateAbsenceInput', () => {
  test('accepts a valid weekday absence', () => {
    const result = validateAbsenceInput({ date: '2026-07-24', reason: 'doctor appointment' }, TODAY)
    expect(result).toEqual({ ok: true, value: { date: '2026-07-24', reason: 'doctor appointment' } })
  })
  test('trims the reason', () => {
    const result = validateAbsenceInput({ date: '2026-07-24', reason: '  travel  ' }, TODAY)
    expect(result.ok && result.value.reason).toBe('travel')
  })
  test('rejects non-object input', () => {
    expect(validateAbsenceInput(null, TODAY).ok).toBe(false)
  })
  test('rejects malformed date', () => {
    const result = validateAbsenceInput({ date: 'tomorrow', reason: 'x' }, TODAY)
    expect(!result.ok && result.error).toMatch(/date/i)
  })
  test('rejects weekend', () => {
    const result = validateAbsenceInput({ date: '2026-07-25', reason: 'x' }, TODAY)
    expect(!result.ok && result.error).toMatch(/weekend/i)
  })
  test('rejects past date', () => {
    const result = validateAbsenceInput({ date: '2026-07-22', reason: 'x' }, TODAY)
    expect(!result.ok && result.error).toMatch(/past/i)
  })
  test('rejects empty reason', () => {
    const result = validateAbsenceInput({ date: '2026-07-24', reason: '   ' }, TODAY)
    expect(!result.ok && result.error).toMatch(/reason/i)
  })
  test('rejects reason over 500 chars', () => {
    const result = validateAbsenceInput({ date: '2026-07-24', reason: 'a'.repeat(501) }, TODAY)
    expect(!result.ok && result.error).toMatch(/500/)
  })
  test('accepts the last visible day (Friday of week 8)', () => {
    const result = validateAbsenceInput({ date: '2026-09-18', reason: 'x' }, TODAY)
    expect(result.ok).toBe(true)
  })
  test('rejects dates beyond the 8-week board window', () => {
    const result = validateAbsenceInput({ date: '2026-09-21', reason: 'x' }, TODAY)
    expect(!result.ok && result.error).toMatch(/8 weeks/i)
  })
})
