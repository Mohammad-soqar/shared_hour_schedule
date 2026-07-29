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

export interface InviteView {
  email: string
  name: string
  status: 'pending' | 'accepted' | 'declined'
}

export interface SignupView {
  id: string
  email: string
  date: string
  note: string
  invites: InviteView[]
  display_name: string
  team: string
}

export interface MyInviteView {
  id: string
  date: string
  note: string
  inviterName: string
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
