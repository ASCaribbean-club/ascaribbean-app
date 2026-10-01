import type { IsoDate, Unavailability } from '@domain/entities/unavailability'

// specs/player-unavailability.md §1.
//
// Date semantics: Unavailability dates are calendar days (`YYYY-MM-DD`), so
// `now` is reduced to its LOCAL calendar day (the device's "today", the
// convention a coach reasons in) and compared to the stored days as strings.
// Zero-padded ISO dates sort lexicographically in chronological order, so no
// string -> Date parsing (which would be read as UTC midnight and shift the day
// west of UTC) is involved. Which timezone defines "today" is OPEN (PO-PU-09).
// The start bound is inclusive, the end bound exclusive: on the
// expectedReturnOn / liftedOn day the person is available again. These
// policies never read the clock — `now` is always a parameter.

export type AvailabilityStatus = 'available' | 'medical' | 'suspended'
export type TeammateAvailabilityStatus = 'available' | 'unavailable' | 'suspended'

function toLocalIsoDate(now: Date): IsoDate {
  const y = String(now.getFullYear()).padStart(4, '0')
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isUnavailabilityActive(u: Unavailability, now: Date): boolean {
  const today = toLocalIsoDate(now)
  if (u.startsOn > today) return false

  switch (u.kind) {
    case 'medical':
      return u.expectedReturnOn === null || today < u.expectedReturnOn
    case 'suspension':
      return u.liftedOn === null || today < u.liftedOn
    default: {
      const unreachable: never = u
      return unreachable
    }
  }
}

export function getAvailabilityStatus(list: Unavailability[], now: Date): AvailabilityStatus {
  const active = list.filter((u) => isUnavailabilityActive(u, now))
  // PROVISIONAL precedence: medical wins when both are active (the mockup shows
  // one badge per player) — see docs/DEFAULTS-A-CHALLENGER.md,
  // "Priorité médical / suspension".
  if (active.some((u) => u.kind === 'medical')) return 'medical'
  if (active.some((u) => u.kind === 'suspension')) return 'suspended'
  return 'available'
}

// Teammate projection: the medical reason and return date never reach a
// teammate — only a status is returned (AC-01, AC-PU-06).
export function toTeammateStatus(status: AvailabilityStatus): TeammateAvailabilityStatus {
  switch (status) {
    case 'available':
      return 'available'
    case 'medical':
      return 'unavailable'
    case 'suspended':
      return 'suspended'
    default: {
      const unreachable: never = status
      return unreachable
    }
  }
}
