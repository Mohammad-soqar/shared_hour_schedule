import { describe, expect, test } from 'vitest'
import { validateAbsenceInput, validateSignupInput } from './validation'

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
  test('accepts the last visible weekday (Friday of week 8)', () => {
    const result = validateAbsenceInput({ date: '2026-09-18', reason: 'x' }, TODAY)
    expect(result.ok).toBe(true)
  })
  test('rejects dates beyond the 8-week board window', () => {
    const result = validateAbsenceInput({ date: '2026-09-21', reason: 'x' }, TODAY)
    expect(!result.ok && result.error).toMatch(/8 weeks/i)
  })
})

describe('validateSignupInput', () => {
  test('accepts a weekend signup with a note and invited teammate', () => {
    const result = validateSignupInput(
      { date: '2026-07-25', note: ' shipping the demo ', invitedEmail: 'Sara@X.com ' }, TODAY,
    )
    expect(result).toEqual({
      ok: true,
      value: { date: '2026-07-25', note: 'shipping the demo', invitedEmail: 'sara@x.com' },
    })
  })
  test('accepts an empty note and no invite', () => {
    const result = validateSignupInput({ date: '2026-07-26', note: '' }, TODAY)
    expect(result).toEqual({ ok: true, value: { date: '2026-07-26', note: '', invitedEmail: null } })
  })
  test('rejects weekdays', () => {
    const result = validateSignupInput({ date: '2026-07-24', note: '' }, TODAY)
    expect(!result.ok && result.error).toMatch(/weekend/i)
  })
  test('rejects past weekends', () => {
    const result = validateSignupInput({ date: '2026-07-19', note: '' }, TODAY)
    expect(!result.ok && result.error).toMatch(/past/i)
  })
  test('rejects weekends beyond the window', () => {
    const result = validateSignupInput({ date: '2026-09-26', note: '' }, TODAY)
    expect(!result.ok && result.error).toMatch(/8 weeks/i)
  })
  test('accepts the final visible Sunday', () => {
    expect(validateSignupInput({ date: '2026-09-20', note: '' }, TODAY).ok).toBe(true)
  })
  test('rejects notes over 500 chars', () => {
    const result = validateSignupInput({ date: '2026-07-25', note: 'a'.repeat(501) }, TODAY)
    expect(!result.ok && result.error).toMatch(/500/)
  })
  test('rejects malformed invited email', () => {
    const result = validateSignupInput({ date: '2026-07-25', note: '', invitedEmail: 'not-an-email' }, TODAY)
    expect(!result.ok && result.error).toMatch(/teammate/i)
  })
})
