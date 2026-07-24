import { isPastDate, isValidDateString, isWeekend, lastSelectableDate, MAX_WEEKS_AHEAD } from './dates'

const MAX_REASON_LENGTH = 500
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/

export type AbsenceInput = { date: string; reason: string }
export type SignupInput = { date: string; note: string; invitedEmail: string | null }
export type ValidationResult =
  | { ok: true; value: AbsenceInput }
  | { ok: false; error: string }
export type SignupValidationResult =
  | { ok: true; value: SignupInput }
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

export function validateSignupInput(input: unknown, today: string): SignupValidationResult {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: 'Invalid request body.' }
  }
  const { date, note, invitedEmail } = input as Record<string, unknown>
  if (typeof date !== 'string' || !isValidDateString(date)) {
    return { ok: false, error: 'Please pick a valid date.' }
  }
  if (!isWeekend(date)) {
    return { ok: false, error: "Sign-ups are for weekends — weekdays don't need one." }
  }
  if (isPastDate(date, today)) {
    return { ok: false, error: 'That date is in the past.' }
  }
  if (date > lastSelectableDate(today)) {
    return { ok: false, error: `That date is too far ahead — you can plan up to ${MAX_WEEKS_AHEAD} weeks out.` }
  }
  const trimmedNote = typeof note === 'string' ? note.trim() : ''
  if (trimmedNote.length > MAX_REASON_LENGTH) {
    return { ok: false, error: 'Note is too long (max 500 characters).' }
  }
  let invited: string | null = null
  if (typeof invitedEmail === 'string' && invitedEmail.trim().length > 0) {
    const normalized = invitedEmail.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(normalized)) {
      return { ok: false, error: "That teammate email doesn't look right." }
    }
    invited = normalized
  }
  return { ok: true, value: { date, note: trimmedNote, invitedEmail: invited } }
}
