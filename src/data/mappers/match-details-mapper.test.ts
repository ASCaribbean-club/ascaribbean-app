import { describe, expect, it } from 'vitest'
import type { MatchDetails } from '@domain/entities/match-details'
import type { MatchDetailsRow } from '../dto/match-details-dto'
import { toMatchDetails, toMatchDetailsRow } from './match-details-mapper'

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
