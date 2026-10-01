import { describe, expect, it } from 'vitest'
import type { TeamAvailability } from '@domain/usecases/team-availability/GetTeamAvailabilityUseCase'
import {
  buildAvailabilityRows,
  countAvailability,
  filterAvailabilityRows,
  formatAvailabilitySubtitle,
  outCategoryLabels,
} from './availability-view'

const coach: TeamAvailability = {
  view: 'coach',
  entries: [
    { userId: '1', displayName: 'A', status: 'available', startsOn: null, endsOn: null },
    { userId: '2', displayName: 'B', status: 'medical', startsOn: '2026-09-24', endsOn: null },
    { userId: '3', displayName: 'C', status: 'suspended', startsOn: '2026-09-15', endsOn: '2026-10-06' },
  ],
}

const teammate: TeamAvailability = {
  view: 'teammate',
  entries: [
    { userId: '1', displayName: 'A', status: 'available', startsOn: null, endsOn: null },
    { userId: '2', displayName: 'B', status: 'unavailable', startsOn: null, endsOn: null },
    { userId: '3', displayName: 'C', status: 'suspended', startsOn: '2026-09-15', endsOn: '2026-10-06' },
  ],
}

describe('availability view', () => {
  it('formats subtitles with an exclusive end worded as a return date', () => {
    expect(formatAvailabilitySubtitle(null, null)).toBeNull()
    expect(formatAvailabilitySubtitle('2026-09-24', null)).toMatch(/^Depuis le 24 sept/)
    expect(formatAvailabilitySubtitle('2026-09-15', '2026-10-06')).toMatch(/retour le 6 oct/)
  })

  it('coach rows keep medical wording data and dates', () => {
    const rows = buildAvailabilityRows(coach)
    expect(rows[0].subtitle).toBe('Aucune indisponibilité')
    expect(rows[1]).toMatchObject({ status: 'medical' })
    expect(rows[1].subtitle).toMatch(/^Depuis le 24 sept/)
    expect(rows[2].subtitle).toMatch(/retour le 6 oct/)
  })

  it('teammate rows never carry medical status nor a subtitle for unavailable', () => {
    const rows = buildAvailabilityRows(teammate)
    expect(rows.map((r) => r.status)).toEqual(['available', 'unavailable', 'suspended'])
    expect(rows[0].subtitle).toBeNull()
    expect(rows[1].subtitle).toBeNull()
    expect(rows[2].subtitle).toMatch(/Depuis le 15 sept/)
    expect(JSON.stringify(rows)).not.toMatch(/medical|Malade/i)
  })

  it('counts and filters by category, medical and unavailable both being "out"', () => {
    for (const availability of [coach, teammate]) {
      const rows = buildAvailabilityRows(availability)
      expect(countAvailability(rows)).toEqual({ available: 1, out: 1, suspended: 1 })
      expect(filterAvailabilityRows(rows, 'all')).toHaveLength(3)
      expect(filterAvailabilityRows(rows, 'out').map((r) => r.userId)).toEqual(['2'])
      expect(filterAvailabilityRows(rows, 'suspended').map((r) => r.userId)).toEqual(['3'])
      expect(filterAvailabilityRows(rows, 'available').map((r) => r.userId)).toEqual(['1'])
    }
  })

  it('labels the middle category per view, never "Malades" for a player', () => {
    expect(outCategoryLabels('coach')).toEqual({ tile: 'Malades', chip: 'Malades' })
    expect(outCategoryLabels('teammate')).toEqual({ tile: 'Indisponibles', chip: 'Indisponibles' })
  })
})
