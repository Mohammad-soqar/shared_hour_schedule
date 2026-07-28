export interface AbsenceView {
  id: string
  email: string
  date: string
  reason: string
  display_name: string
  team: string
}

export interface SlackEvent {
  text: string
  time: string
}

export interface PinnedPost {
  label: string
  text: string
}

export interface RiyadhClock {
  iso: string
  hh: number
  mm: number
  ss: number
}

export interface SignupView {
  id: string
  email: string
  date: string
  note: string
  invited_emails: string[]
  invited_names: string[]
  display_name: string
  team: string
}

export interface MemberOption {
  email: string
  display_name: string
}

export type ModalState =
  | { mode: 'add'; date: string | null; reason: string; invitedEmails: string[] }
  | { mode: 'edit'; date: string; reason: string; invitedEmails: string[] }

export interface RemovalTarget {
  id: string
  date: string
  kind: 'absence' | 'signup'
}

export interface ToastState {
  text: string
  warn: boolean
}
