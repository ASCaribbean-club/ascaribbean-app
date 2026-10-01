import { describe, expect, it } from 'vitest'
import { toTeamAvailabilityRow } from './team-availability-mapper'

describe('toTeamAvailabilityRow', () => {
  it('maps every known status', () => {
    for (const status of ['available', 'medical', 'suspended', 'unavailable']) {
      expect(toTeamAvailabilityRow({ user_id: 'p-1', full_name: 'Alpha', status, starts_on: null, ends_on: null }).status).toBe(status)
    }
  })

  it('maps dates and names', () => {
    expect(toTeamAvailabilityRow({ user_id: 'p-1', full_name: 'Alpha', status: 'suspended', starts_on: '2026-09-15', ends_on: '2026-10-06' })).toEqual({
      userId: 'p-1', displayName: 'Alpha', status: 'suspended', startsOn: '2026-09-15', endsOn: '2026-10-06',
    })
  })

  it('throws on an unknown status', () => {
    expect(() => toTeamAvailabilityRow({ user_id: 'p-1', full_name: 'A', status: 'x', starts_on: null, ends_on: null })).toThrow()
  })
})
