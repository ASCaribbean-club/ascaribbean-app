import type { IsoDate } from '@domain/entities/unavailability'
import type { TeamAvailability } from '@domain/usecases/team-availability/GetTeamAvailabilityUseCase'

// Display status of a row. 'medical' only ever exists in the coach view; the
// teammate view can only produce 'unavailable' (specs/player-unavailability.md
// UI design §3) — "Malade / Blessé" never reaches a player's component tree.
export type AvailabilityDisplayStatus = 'available' | 'medical' | 'unavailable' | 'suspended'

// 'out' = the middle category: "Malades" for a coach, "Indisponibles" for a player.
export type AvailabilityFilter = 'all' | 'available' | 'out' | 'suspended'

export interface AvailabilityRowView {
  userId: string
  displayName: string
  status: AvailabilityDisplayStatus
  subtitle: string | null
}

export interface AvailabilityCounts {
  available: number
  out: number
  suspended: number
}

const SHORT_DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

// `YYYY-MM-DD` -> "15 sept." — built from the parts, never `new Date('YYYY-MM-DD')`
// (parsed as UTC midnight, shifts the day west of UTC).
export function formatAvailabilityDate(iso: IsoDate): string {
  const [year, month, day] = iso.split('-').map(Number)
  return SHORT_DATE.format(new Date(year, month - 1, day))
}

// Q-UI-04: the end bound is exclusive, so it is worded "retour le" (the day
// the person is available again), never "au" (which would read inclusive).
export function formatAvailabilitySubtitle(startsOn: IsoDate | null, endsOn: IsoDate | null): string | null {
  if (!startsOn) return null
  const from = `Depuis le ${formatAvailabilityDate(startsOn)}`
  return endsOn ? `${from} · retour le ${formatAvailabilityDate(endsOn)}` : from
}

export function buildAvailabilityRows(availability: TeamAvailability): AvailabilityRowView[] {
  if (availability.view === 'coach') {
    return availability.entries.map((entry) => ({
      userId: entry.userId,
      displayName: entry.displayName,
      status: entry.status,
      subtitle: entry.status === 'available' ? 'Aucune indisponibilité' : formatAvailabilitySubtitle(entry.startsOn, entry.endsOn),
    }))
  }

  return availability.entries.map((entry) => ({
    userId: entry.userId,
    displayName: entry.displayName,
    status: entry.status,
    // Q-UI-02: no "Aucune indisponibilité" line in the teammate view. Only a
    // suspension carries dates (the entry has none for 'unavailable').
    subtitle: entry.status === 'suspended' ? formatAvailabilitySubtitle(entry.startsOn, entry.endsOn) : null,
  }))
}

function categoryOf(status: AvailabilityDisplayStatus): keyof AvailabilityCounts {
  switch (status) {
    case 'available':
      return 'available'
    case 'suspended':
      return 'suspended'
    case 'medical':
    case 'unavailable':
      return 'out'
  }
}

export function countAvailability(rows: AvailabilityRowView[]): AvailabilityCounts {
  const counts: AvailabilityCounts = { available: 0, out: 0, suspended: 0 }
  for (const row of rows) counts[categoryOf(row.status)] += 1
  return counts
}

export function filterAvailabilityRows(rows: AvailabilityRowView[], filter: AvailabilityFilter): AvailabilityRowView[] {
  return filter === 'all' ? rows : rows.filter((row) => categoryOf(row.status) === filter)
}

export function outCategoryLabels(view: TeamAvailability['view']): { tile: string; chip: string } {
  return view === 'coach' ? { tile: 'Malades', chip: 'Malades' } : { tile: 'Indisponibles', chip: 'Indisponibles' }
}
