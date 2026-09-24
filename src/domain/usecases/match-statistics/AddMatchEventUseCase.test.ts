import { describe, expect, it, vi } from 'vitest'
import type { Convocation } from '../../entities/convocation'
import type { MatchDetails } from '../../entities/match-details'
import type { MatchEvent } from '../../entities/match-event'
import { DomainError } from '../../errors/domain-error'
import { InconsistentMatchScoreError } from '../../errors/inconsistent-match-score-error'
import { MatchNotStartedError } from '../../errors/match-not-started-error'
import { MatchScoreMissingError } from '../../errors/match-score-missing-error'
import { NotFoundError } from '../../errors/not-found-error'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { MatchDetailsRepository } from '../../repositories/match-details-repository'
import type { MatchEventRepository } from '../../repositories/match-event-repository'
import { AddMatchEventUseCase } from './AddMatchEventUseCase'

const NOW = new Date('2026-09-24T20:00:00.000Z')

function convocationWith(overrides: Partial<Convocation> = {}): Convocation {
  return {
    id: 'convocation-1',
    teamId: 'team-1',
    type: 'match',
    date: '2026-09-24T18:00:00.000Z', // before NOW — kickoff has passed
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

function matchDetailsWith(overrides: Partial<MatchDetails> = {}): MatchDetails {
  return {
    convocationId: 'convocation-1',
    opponentId: 'opponent-1',
    isHome: true,
    meetingPointTime: '2026-09-24T17:00:00.000Z',
    meetingPointLocation: 'Vestiaires',
    goalsFor: null,
    goalsAgainst: null,
    ...overrides,
  }
}

function fakeMatchDetailsRepository(matchDetails: MatchDetails | null): MatchDetailsRepository {
  return {
    upsert: async (details) => details,
    findByConvocationId: async () => matchDetails,
    recordScore: async (convocationId, goalsFor, goalsAgainst) => ({ ...matchDetailsWith(), convocationId, goalsFor, goalsAgainst }),
  }
}

function goalEvent(userId: string, isPenalty = false): MatchEvent {
  return {
    id: `event-${userId}`,
    convocationId: 'convocation-1',
    userId,
    eventType: 'goal',
    isPenalty,
    createdBy: 'coach-1',
    createdAt: '2026-09-24T18:30:00.000Z',
  }
}

function fakeMatchEventRepository(events: MatchEvent[] = [], overrides: Partial<MatchEventRepository> = {}): MatchEventRepository {
  return {
    add: async (event) => ({ id: 'event-new', createdAt: NOW.toISOString(), ...event }),
    delete: async () => {},
    findByConvocation: async () => events,
    ...overrides,
  }
}

describe('AddMatchEventUseCase', () => {
  it('throws NotFoundError when the convocation does not exist', async () => {
    const useCase = new AddMatchEventUseCase(fakeConvocationRepository(null), fakeMatchDetailsRepository(null), fakeMatchEventRepository())

    await expect(
      useCase.execute({ convocationId: 'convocation-1', userId: 'player-1', eventType: 'goal', isPenalty: false, createdBy: 'coach-1', now: NOW }),
    ).rejects.toThrow(NotFoundError)
  })

  it('throws MatchNotStartedError when kickoff has not passed yet', async () => {
    const useCase = new AddMatchEventUseCase(
      fakeConvocationRepository(convocationWith({ date: '2026-09-25T18:00:00.000Z' })),
      fakeMatchDetailsRepository(matchDetailsWith({ goalsFor: 2, goalsAgainst: 1 })),
      fakeMatchEventRepository(),
    )

    await expect(
      useCase.execute({ convocationId: 'convocation-1', userId: 'player-1', eventType: 'goal', isPenalty: false, createdBy: 'coach-1', now: NOW }),
    ).rejects.toThrow(MatchNotStartedError)
  })

  // AC-MS-16 — defensive guard, not a translated DomainError (see the use
  // case's own comment on why).
  it('rejects an invalid penalty flag (isPenalty on a non-goal event) without a DomainError', async () => {
    const useCase = new AddMatchEventUseCase(
      fakeConvocationRepository(convocationWith()),
      fakeMatchDetailsRepository(matchDetailsWith({ goalsFor: 2, goalsAgainst: 1 })),
      fakeMatchEventRepository(),
    )

    let caught: unknown
    try {
      await useCase.execute({
        convocationId: 'convocation-1',
        userId: 'player-1',
        eventType: 'yellow_card',
        isPenalty: true,
        createdBy: 'coach-1',
        now: NOW,
      })
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(Error)
    expect(caught).not.toBeInstanceOf(DomainError)
  })

  // AC-MS-15/MS-14 — a goal cannot be added before the score itself is
  // recorded.
  it('throws MatchScoreMissingError when adding a goal before the score is recorded', async () => {
    const useCase = new AddMatchEventUseCase(
      fakeConvocationRepository(convocationWith()),
      fakeMatchDetailsRepository(matchDetailsWith({ goalsFor: null, goalsAgainst: null })),
      fakeMatchEventRepository(),
    )

    await expect(
      useCase.execute({ convocationId: 'convocation-1', userId: 'player-1', eventType: 'goal', isPenalty: false, createdBy: 'coach-1', now: NOW }),
    ).rejects.toThrow(MatchScoreMissingError)
  })

  // MS-17 — the score-missing check is SKIPPED entirely for penalty_missed.
  it('accepts a penalty_missed event even with no score recorded yet (MS-17)', async () => {
    const add = vi.fn(async (event: Omit<MatchEvent, 'id' | 'createdAt'>) => ({ id: 'event-new', createdAt: NOW.toISOString(), ...event }))
    const useCase = new AddMatchEventUseCase(
      fakeConvocationRepository(convocationWith()),
      fakeMatchDetailsRepository(matchDetailsWith({ goalsFor: null, goalsAgainst: null })),
      fakeMatchEventRepository([], { add }),
    )

    const result = await useCase.execute({
      convocationId: 'convocation-1',
      userId: 'player-1',
      eventType: 'penalty_missed',
      isPenalty: false,
      createdBy: 'coach-1',
      now: NOW,
    })

    expect(add).toHaveBeenCalledExactlyOnceWith({
      convocationId: 'convocation-1',
      userId: 'player-1',
      eventType: 'penalty_missed',
      isPenalty: false,
      createdBy: 'coach-1',
    })
    expect(result.eventType).toBe('penalty_missed')
  })

  // AC-MS-05 — adding one more goal that would push the count past goalsFor
  // is refused.
  it('throws InconsistentMatchScoreError when the new goal would exceed goalsFor', async () => {
    const useCase = new AddMatchEventUseCase(
      fakeConvocationRepository(convocationWith()),
      fakeMatchDetailsRepository(matchDetailsWith({ goalsFor: 1, goalsAgainst: 0 })),
      fakeMatchEventRepository([goalEvent('player-1')]),
    )

    await expect(
      useCase.execute({ convocationId: 'convocation-1', userId: 'player-2', eventType: 'goal', isPenalty: false, createdBy: 'coach-1', now: NOW }),
    ).rejects.toThrow(InconsistentMatchScoreError)
  })

  // A penalty-scored goal is counted EXACTLY like any other goal in the
  // AC-MS-05 consistency check — no separate "penalty count" exists.
  it('counts a penalty goal in the consistency check exactly like an ordinary goal', async () => {
    const useCase = new AddMatchEventUseCase(
      fakeConvocationRepository(convocationWith()),
      fakeMatchDetailsRepository(matchDetailsWith({ goalsFor: 1, goalsAgainst: 0 })),
      fakeMatchEventRepository([goalEvent('player-1')]),
    )

    await expect(
      useCase.execute({ convocationId: 'convocation-1', userId: 'player-2', eventType: 'goal', isPenalty: true, createdBy: 'coach-1', now: NOW }),
    ).rejects.toThrow(InconsistentMatchScoreError)
  })

  it('adds a goal event when the score is recorded and the count stays consistent', async () => {
    const add = vi.fn(async (event: Omit<MatchEvent, 'id' | 'createdAt'>) => ({ id: 'event-new', createdAt: NOW.toISOString(), ...event }))
    const useCase = new AddMatchEventUseCase(
      fakeConvocationRepository(convocationWith()),
      fakeMatchDetailsRepository(matchDetailsWith({ goalsFor: 2, goalsAgainst: 1 })),
      fakeMatchEventRepository([goalEvent('player-1')], { add }),
    )

    const result = await useCase.execute({
      convocationId: 'convocation-1',
      userId: 'player-2',
      eventType: 'goal',
      isPenalty: true,
      createdBy: 'coach-1',
      now: NOW,
    })

    expect(add).toHaveBeenCalledExactlyOnceWith({
      convocationId: 'convocation-1',
      userId: 'player-2',
      eventType: 'goal',
      isPenalty: true,
      createdBy: 'coach-1',
    })
    expect(result.isPenalty).toBe(true)
  })

  it('adds a card event without any score check at all', async () => {
    const add = vi.fn(async (event: Omit<MatchEvent, 'id' | 'createdAt'>) => ({ id: 'event-new', createdAt: NOW.toISOString(), ...event }))
    const useCase = new AddMatchEventUseCase(
      fakeConvocationRepository(convocationWith()),
      fakeMatchDetailsRepository(matchDetailsWith({ goalsFor: null, goalsAgainst: null })),
      fakeMatchEventRepository([], { add }),
    )

    const result = await useCase.execute({
      convocationId: 'convocation-1',
      userId: 'player-1',
      eventType: 'red_card',
      isPenalty: false,
      createdBy: 'coach-1',
      now: NOW,
    })

    expect(result.eventType).toBe('red_card')
  })
})
