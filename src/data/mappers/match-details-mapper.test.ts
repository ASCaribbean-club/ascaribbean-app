import { describe, expect, it } from 'vitest'
import type { MatchArrangements, MatchDetails } from '@domain/entities/match-details'
import type { MatchDetailsRow } from '../dto/match-details-dto'
import { toMatchArrangementsUpdateRow, toMatchDetails, toMatchDetailsRow } from './match-details-mapper'

describe('match-details-mapper', () => {
  it('maps a row with no score recorded yet (AC-MS-15 state) to a domain entity with null goals', () => {
    const row: MatchDetailsRow = {
      convocation_id: 'c1',
      opponent_id: 'opponent-1',
      is_home: true,
      meeting_point_time: '2026-09-24T17:00:00.000Z',
      meeting_point_location: 'Vestiaires',
      goals_for: null,
      goals_against: null,
    }

    expect(toMatchDetails(row)).toEqual({
      convocationId: 'c1',
      opponentId: 'opponent-1',
      isHome: true,
      meetingPointTime: '2026-09-24T17:00:00.000Z',
      meetingPointLocation: 'Vestiaires',
      goalsFor: null,
      goalsAgainst: null,
    })
  })

  it('maps a row with a recorded score to a domain entity', () => {
    const row: MatchDetailsRow = {
      convocation_id: 'c1',
      opponent_id: 'opponent-1',
      is_home: true,
      meeting_point_time: '2026-09-24T17:00:00.000Z',
      meeting_point_location: 'Vestiaires',
      goals_for: 2,
      goals_against: 1,
    }

    const details = toMatchDetails(row)
    expect(details.goalsFor).toBe(2)
    expect(details.goalsAgainst).toBe(1)
  })

  it('round-trips a domain entity with no score back to a row with null goals', () => {
    const details: MatchDetails = {
      convocationId: 'c1',
      opponentId: 'opponent-1',
      isHome: false,
      meetingPointTime: '2026-09-24T17:00:00.000Z',
      meetingPointLocation: 'Vestiaires',
      goalsFor: null,
      goalsAgainst: null,
    }

    expect(toMatchDetailsRow(details)).toEqual({
      convocation_id: 'c1',
      opponent_id: 'opponent-1',
      is_home: false,
      meeting_point_time: '2026-09-24T17:00:00.000Z',
      meeting_point_location: 'Vestiaires',
      goals_for: null,
      goals_against: null,
    })
  })

  it('round-trips a domain entity with a recorded score back to a row', () => {
    const details: MatchDetails = {
      convocationId: 'c1',
      opponentId: 'opponent-1',
      isHome: false,
      meetingPointTime: '2026-09-24T17:00:00.000Z',
      meetingPointLocation: 'Vestiaires',
      goalsFor: 0,
      goalsAgainst: 0,
    }

    expect(toMatchDetailsRow(details)).toEqual({
      convocation_id: 'c1',
      opponent_id: 'opponent-1',
      is_home: false,
      meeting_point_time: '2026-09-24T17:00:00.000Z',
      meeting_point_location: 'Vestiaires',
      goals_for: 0,
      goals_against: 0,
    })
  })
})

// specs/edit-match-details.md §5 — the narrow update mapper: exactly 3
// columns, never opponent_id/goals_for/goals_against, even though the input
// MatchArrangements carries none of those at all here to accidentally leak
// (Pick<> makes it a compile error, see domain/entities/match-details.ts).
describe('toMatchArrangementsUpdateRow', () => {
  it('maps arrangements to exactly the 3 writable columns', () => {
    const arrangements: MatchArrangements = {
      isHome: false,
      meetingPointTime: '2026-08-10T14:00:00.000Z',
      meetingPointLocation: 'Parking visiteurs',
    }

    expect(toMatchArrangementsUpdateRow(arrangements)).toEqual({
      is_home: false,
      meeting_point_time: '2026-08-10T14:00:00.000Z',
      meeting_point_location: 'Parking visiteurs',
    })
  })

  it('never includes an opponent_id or goals_for/goals_against key on the mapped row', () => {
    const mapped = toMatchArrangementsUpdateRow({
      isHome: true,
      meetingPointTime: '2026-08-10T14:00:00.000Z',
      meetingPointLocation: 'Vestiaires',
    })

    expect(Object.keys(mapped).sort()).toEqual(['is_home', 'meeting_point_location', 'meeting_point_time'])
  })

  it('maps a null meetingPointTime/meetingPointLocation through unchanged', () => {
    const mapped = toMatchArrangementsUpdateRow({
      isHome: true,
      meetingPointTime: null,
      meetingPointLocation: null,
    })

    expect(mapped).toEqual({
      is_home: true,
      meeting_point_time: null,
      meeting_point_location: null,
    })
  })
})
