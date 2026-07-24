export interface AbsenceView {
  id: string
  email: string
  date: string
  reason: string
  display_name: string
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
  invited_email: string | null
  display_name: string
  invited_name: string | null
}

export interface MemberOption {
  email: string
  display_name: string
}

export type ModalState =
  | { mode: 'add'; date: string | null; reason: string; invitedEmail: string | null }
  | { mode: 'edit'; date: string; reason: string; invitedEmail: string | null }

export interface RemovalTarget {
  id: string
  date: string
  kind: 'absence' | 'signup'
}

export interface ToastState {
  text: string
  warn: boolean
}
