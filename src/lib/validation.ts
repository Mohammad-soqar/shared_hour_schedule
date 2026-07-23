import { isPastDate, isValidDateString, isWeekend, lastSelectableDate, MAX_WEEKS_AHEAD } from './dates'

const MAX_REASON_LENGTH = 500

export type AbsenceInput = { date: string; reason: string }
export type ValidationResult =
  | { ok: true; value: AbsenceInput }
  | { ok: false; error: string }

export function validateAbsenceInput(input: unknown, today: string): ValidationResult {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: 'Invalid request body.' }
  }
  const { date, reason } = input as Record<string, unknown>
  if (typeof date !== 'string' || !isValidDateString(date)) {
    return { ok: false, error: 'Please pick a valid date.' }
  }
  if (isWeekend(date)) {
    return { ok: false, error: 'That day is a weekend — the shared hour only runs Monday to Friday.' }
  }
  if (isPastDate(date, today)) {
    return { ok: false, error: 'That date is in the past.' }
  }
  if (date > lastSelectableDate(today)) {
    return { ok: false, error: `That date is too far ahead — you can plan up to ${MAX_WEEKS_AHEAD} weeks out.` }
  }
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    return { ok: false, error: 'Please add a short reason.' }
  }
  const trimmed = reason.trim()
  if (trimmed.length > MAX_REASON_LENGTH) {
    return { ok: false, error: 'Reason is too long (max 500 characters).' }
  }
  return { ok: true, value: { date, reason: trimmed } }
}
