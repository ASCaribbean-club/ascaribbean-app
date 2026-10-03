import { describe, expect, it } from 'vitest'
import type { Convocation } from '../../entities/convocation'
import type { MatchDetails } from '../../entities/match-details'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { MatchDetailsRepository } from '../../repositories/match-details-repository'
import { GetTeamRecentFormUseCase } from './GetTeamRecentFormUseCase'

function convocationWith(overrides: Partial<Convocation>): Convocation {
  return {
    id: 'c1',
    teamId: 'team-1',
    type: 'match',
    date: '2026-09-01T18:00:00.000Z',
    location: 'Stade municipal',
    trainingLocation: null,
    status: 'open',
    closedAt: null,
    closedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    createdBy: 'coach-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function matchDetailsWith(overrides: Partial<MatchDetails>): MatchDetails {
  return {
    convocationId: 'c1',
    opponentId: 'opponent-1',
    isHome: true,
    meetingPointTime: null,
    meetingPointLocation: null,
    goalsFor: null,
    goalsAgainst: null,
    ...overrides,
  }
}

function fakeConvocationRepository(convocations: Convocation[]): ConvocationRepository {
  return {
    listForTeam: async () => convocations,
    findById: async () => null,
    createTraining: async () => { throw new Error('not used in this test') },
    createMatch: async () => { throw new Error('not used in this test') },
    createMeeting: async () => { throw new Error('not used in this test') },
    updateArrangements: async () => { throw new Error('not used in this test') },
    updateTraining: async () => { throw new Error('not used in this test') },
    updateMatch: async () => { throw new Error('not used in this test') },
    updateDate: async () => { throw new Error('not used in this test') },
    updateMeeting: async () => { throw new Error('not used in this test') },
  }
}

function fakeMatchDetailsRepository(details: MatchDetails[]): MatchDetailsRepository {
  return {
    upsert: async (d) => d,
    findByConvocationId: async () => null,
    recordScore: async () => { throw new Error('not used in this test') },
    updateArrangements: async () => { throw new Error('not used in this test') },
    findByConvocations: async (convocationIds) => details.filter((d) => convocationIds.includes(d.convocationId)),
  }
}

describe('GetTeamRecentFormUseCase', () => {
  it('derives form and goal totals from recorded match scores only', async () => {
    const convocations = [
      convocationWith({ id: 'm1', date: '2026-09-01T18:00:00.000Z' }),
      convocationWith({ id: 'm2', date: '2026-09-08T18:00:00.000Z' }),
      convocationWith({ id: 't1', type: 'training', date: '2026-09-05T18:00:00.000Z' }),
    ]
    const details = [
      matchDetailsWith({ convocationId: 'm1', goalsFor: 2, goalsAgainst: 0 }), // win
      matchDetailsWith({ convocationId: 'm2', goalsFor: 1, goalsAgainst: 1 }), // draw
    ]

    const useCase = new GetTeamRecentFormUseCase(fakeConvocationRepository(convocations), fakeMatchDetailsRepository(details))
    const result = await useCase.execute({ teamId: 'team-1' })

    expect(result.form).toEqual(['win', 'draw'])
    expect(result.goalsFor).toBe(3)
    expect(result.goalsAgainst).toBe(1)
  })

  it('excludes matches with no score recorded yet (AC-MS-15)', async () => {
    const convocations = [convocationWith({ id: 'm1' })]
    const details = [matchDetailsWith({ convocationId: 'm1', goalsFor: null, goalsAgainst: null })]

    const useCase = new GetTeamRecentFormUseCase(fakeConvocationRepository(convocations), fakeMatchDetailsRepository(details))
    const result = await useCase.execute({ teamId: 'team-1' })

    expect(result.form).toEqual([])
    expect(result.goalsFor).toBe(0)
    expect(result.goalsAgainst).toBe(0)
  })

  it('caps the returned form to the most recent RECENT_MATCH_COUNT matches', async () => {
    const convocations = Array.from({ length: 7 }, (_, index) =>
      convocationWith({ id: `m${index}`, date: `2026-09-0${index + 1}T18:00:00.000Z` }),
    )
    const details = convocations.map((c) => matchDetailsWith({ convocationId: c.id, goalsFor: 1, goalsAgainst: 0 }))

    const useCase = new GetTeamRecentFormUseCase(fakeConvocationRepository(convocations), fakeMatchDetailsRepository(details))
    const result = await useCase.execute({ teamId: 'team-1' })

    expect(result.form).toHaveLength(5)
    // Season-wide total still counts every match, not just the capped form.
    expect(result.goalsFor).toBe(7)
  })
})
