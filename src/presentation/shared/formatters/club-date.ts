// specs/mob-treasurer-finances.md PO-FI-09 — "today" and "the current month"
// are those of the CLUB timezone (the Antilles), never the device's. The
// domain has no clock: it receives this yyyy-mm-dd string from the caller.
// America/Martinique is UTC-4 with no daylight saving.
export const CLUB_TIME_ZONE = 'America/Martinique'

// yyyy-mm-dd of `now` in the club timezone (the en-CA locale formats as ISO).
export function clubToday(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CLUB_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

// "4 oct." from a yyyy-mm-dd date. Built from its parts (never
// `new Date('2026-10-04')`, parsed as UTC, which can shift the day).
export function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  if (!year || !month || !day) return isoDate
  const date = new Date(year, month - 1, day)
  return `${date.getDate()} ${date.toLocaleDateString('fr-FR', { month: 'short' })}`
}

// "15 septembre 2026".
export function formatFullDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  if (!year || !month || !day) return isoDate
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
