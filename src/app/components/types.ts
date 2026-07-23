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

export type ModalState =
  | { mode: 'add'; date: string | null; reason: string }
  | { mode: 'edit'; date: string; reason: string }

export interface ToastState {
  text: string
  warn: boolean
}
