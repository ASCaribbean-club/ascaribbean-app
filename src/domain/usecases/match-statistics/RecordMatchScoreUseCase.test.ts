import { describe, expect, it, vi } from 'vitest'
import type { Convocation } from '../../entities/convocation'
import type { MatchDetails } from '../../entities/match-details'
import type { MatchEvent } from '../../entities/match-event'
import { InconsistentMatchScoreError } from '../../errors/inconsistent-match-score-error'
import { MatchNotStartedError } from '../../errors/match-not-started-error'
import { NotFoundError } from '../../errors/not-found-error'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { MatchDetailsRepository } from '../../repositories/match-details-repository'
import type { MatchEventRepository } from '../../repositories/match-event-repository'
import { RecordMatchScoreUseCase } from './RecordMatchScoreUseCase'

const NOW = new Date('2026-09-24T20:00:00.000Z')

function convocationWith(overrides: Partial<Convocation> = {}): Convocation {
  return {
    id: 'convocation-1',
    teamId: 'team-1',
    type: 'match',
    date: '2026-09-24T18:00:00.000Z', // kickoff — before NOW by default
    location: 'Stade',
    status: 'open',
    closedAt: null,
    closedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    createdBy: 'coach-1',
    ...overrides,
  }
}

function fakeConvocationRepository(convocation: Convocation | null): ConvocationRepository {
  return {
    listForTeam: async () => [],
    findById: async () => convocation,
    createTraining: async () => convocation as Convocation,
    createMatch: async () => convocation as Convocation,
    createMeeting: async () => convocation as Convocation,
  }
}

function fakeMatchEventRepository(events: MatchEvent[] = []): MatchEventRepository {
  return {
    add: async (event) => ({ id: 'event-new', createdAt: NOW.toISOString(), ...event }),
    delete: async () => {},
    findByConvocation: async () => events,
  }
}

function fakeMatchDetailsRepository(overrides: Partial<MatchDetailsRepository> = {}): MatchDetailsRepository {
  return {
    upsert: async (details) => details,
    findByConvocationId: async () => null,
    recordScore: async (convocationId, goalsFor, goalsAgainst) => ({
      convocationId,
      opponentId: 'opponent-1',
      isHome: true,
      meetingPointTime: '2026-09-24T17:00:00.000Z',
      meetingPointLocation: 'Vestiaires',
      goalsFor,
      goalsAgainst,
    }) as MatchDetails,
    ...overrides,
  }
}

function goalEvent(userId: string): MatchEvent {
  return {
    id: `event-${userId}`,
    convocationId: 'convocation-1',
    userId,
    eventType: 'goal',
    isPenalty: false,
    createdBy: 'coach-1',
    createdAt: '2026-09-24T18:30:00.000Z',
  }
}

describe('RecordMatchScoreUseCase', () => {
  it('throws NotFoundError when the convocation does not exist', async () => {
    const useCase = new RecordMatchScoreUseCase(fakeConvocationRepository(null), fakeMatchEventRepository(), fakeMatchDetailsRepository())

    await expect(useCase.execute({ convocationId: 'convocation-1', goalsFor: 2, goalsAgainst: 1, now: NOW })).rejects.toThrow(NotFoundError)
  })

  // AC-MS-13/MS-12 — exactly-at-kickoff and just-before both stay refused;
  // the boundary itself is covered by match-result-timing-rules.test.ts,
  // this only proves the use case actually wires that predicate in.
  it('throws MatchNotStartedError when kickoff has not passed yet', async () => {
    const useCase = new RecordMatchScoreUseCase(
      fakeConvocationRepository(convocationWith({ date: '2026-09-25T18:00:00.000Z' })),
      fakeMatchEventRepository(),
      fakeMatchDetailsRepository(),
    )

    await expect(useCase.execute({ convocationId: 'convocation-1', goalsFor: 2, goalsAgainst: 1, now: NOW })).rejects.toThrow(
      MatchNotStartedError,
    )
  })

  // AC-MS-05 — revising goalsFor DOWN below the number of goal events
  // already recorded is refused with the SAME error class as
  // AddMatchEventUseCase's own consistency check.
  it('throws InconsistentMatchScoreError when the revised goalsFor would fall below the recorded goal event count', async () => {
    const useCase = new RecordMatchScoreUseCase(
      fakeConvocationRepository(convocationWith()),
      fakeMatchEventRepository([goalEvent('player-1'), goalEvent('player-2')]),
      fakeMatchDetailsRepository(),
    )

    await expect(useCase.execute({ convocationId: 'convocation-1', goalsFor: 1, goalsAgainst: 0, now: NOW })).rejects.toThrow(
      InconsistentMatchScoreError,
    )
  })

  it('records the score once kickoff has passed and the score is consistent with recorded goal events', async () => {
    const recordScore = vi.fn(async (convocationId: string, goalsFor: number, goalsAgainst: number) => ({
      convocationId,
      opponentId: 'opponent-1',
      isHome: true,
      meetingPointTime: '2026-09-24T17:00:00.000Z',
      meetingPointLocation: 'Vestiaires',
      goalsFor,
      goalsAgainst,
    }))
    const useCase = new RecordMatchScoreUseCase(
      fakeConvocationRepository(convocationWith()),
      fakeMatchEventRepository([goalEvent('player-1')]),
      fakeMatchDetailsRepository({ recordScore }),
    )

    const result = await useCase.execute({ convocationId: 'convocation-1', goalsFor: 2, goalsAgainst: 1, now: NOW })

    expect(recordScore).toHaveBeenCalledExactlyOnceWith('convocation-1', 2, 1)
    expect(result.goalsFor).toBe(2)
  })

  // AC-MS-01 — deleting every goal event never changes the score itself;
  // this proves a score of 0 recorded goal events is still perfectly
  // consistent (0 <= any goalsFor).
  it('allows recording a score with zero recorded goal events (AC-MS-01)', async () => {
    const useCase = new RecordMatchScoreUseCase(fakeConvocationRepository(convocationWith()), fakeMatchEventRepository([]), fakeMatchDetailsRepository())

    const result = await useCase.execute({ convocationId: 'convocation-1', goalsFor: 2, goalsAgainst: 1, now: NOW })
    expect(result.goalsFor).toBe(2)
  })
})
