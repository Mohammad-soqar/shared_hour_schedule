interface ClockMarkProps {
  size: number
  stroke?: string
  strokeWidth?: number
  showDot?: boolean
}

export function ClockMark({ size, stroke = '#14322D', strokeWidth = 3, showDot = true }: ClockMarkProps) {
  return (
    <svg viewBox="0 0 48 48" style={{ width: size, height: size, flex: 'none', display: 'block' }} aria-hidden="true">
      <circle cx="24" cy="24" r="20.5" fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      <path d="M24 24 L24 6 A18 18 0 0 1 28.66 6.61 Z" fill="#006A6A" />
      {showDot && <circle cx="24" cy="24" r="2.2" fill="#14322D" />}
    </svg>
  )
}
