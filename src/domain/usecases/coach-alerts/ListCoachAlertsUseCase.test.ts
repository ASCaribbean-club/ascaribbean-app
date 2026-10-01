import { describe, expect, it, vi } from 'vitest'
import type { Convocation } from '../../entities/convocation'
import type { MatchDetails } from '../../entities/match-details'
import type { MatchEvent } from '../../entities/match-event'
import type { Opponent } from '../../entities/opponent'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { MatchDetailsRepository } from '../../repositories/match-details-repository'
import type { MatchEventRepository } from '../../repositories/match-event-repository'
import type { OpponentRepository } from '../../repositories/opponent-repository'
import { ListCoachAlertsUseCase } from './ListCoachAlertsUseCase'

function convocationWith(overrides: Partial<Convocation>): Convocation {
  return {
    id: 'c1',
    teamId: 'team-1',
    type: 'training',
    date: '2026-08-18T18:00:00.000Z',
    location: 'Stade municipal',
    trainingLocation: null,
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

function matchEventWith(overrides: Partial<MatchEvent>): MatchEvent {
  return {
    id: `ev-${Math.random()}`,
    convocationId: 'c1',
    userId: 'player-1',
    eventType: 'goal',
    isPenalty: false,
    createdBy: 'coach-1',
    createdAt: '2026-08-01T18:00:00Z',
    ...overrides,
  }
}

function fakeConvocationRepository(convocations: Convocation[] = []): ConvocationRepository {
  return {
    listForTeam: async () => convocations,
    findById: async () => null,
    createTraining: vi.fn(),
    createMatch: vi.fn(),
    createMeeting: vi.fn(),
    updateArrangements: vi.fn(),
    updateTraining: async () => { throw new Error('not used in this test') },
    updateMatch: async () => { throw new Error('not used in this test') },
    updateMeeting: async () => { throw new Error('not used in this test') },
  }
}

function fakeMatchDetailsRepository(matchDetails: MatchDetails[] = [], findByConvocations = vi.fn(async () => matchDetails)): MatchDetailsRepository {
  return {
    upsert: vi.fn(),
    findByConvocationId: vi.fn(),
    recordScore: vi.fn(),
    updateArrangements: vi.fn(),
    findByConvocations,
  }
}

function fakeMatchEventRepository(matchEvents: MatchEvent[] = [], findByConvocations = vi.fn(async () => matchEvents)): MatchEventRepository {
  return {
    add: vi.fn(),
    delete: vi.fn(),
    findByConvocation: vi.fn(),
    findByConvocations,
    getOwnGoalsCountForCurrentSeason: vi.fn(),
    getOwnCardsCountForCurrentSeason: vi.fn(),
  }
}

function fakeOpponentRepository(opponents: Opponent[] = [], findByTeamId = vi.fn(async () => opponents)): OpponentRepository {
  return {
    findByTeamId,
    findById: vi.fn(),
    create: vi.fn(),
    addToTeam: vi.fn(),
  }
}

const now = new Date('2026-08-19T12:00:00.000Z')

describe('ListCoachAlertsUseCase', () => {
  it('excludes a convocation with no missing action from the result', async () => {
    const useCase = new ListCoachAlertsUseCase(
      fakeConvocationRepository([convocationWith({ id: 'c1', type: 'training', status: 'closed', date: '2026-08-01T18:00:00.000Z' })]),
      fakeMatchDetailsRepository(),
      fakeMatchEventRepository(),
      fakeOpponentRepository(),
    )

    const result = await useCase.execute({ teamId: 'team-1', now })

    expect(result).toEqual([])
  })

  it('includes a past open training convocation flagged for signal A only', async () => {
    const useCase = new ListCoachAlertsUseCase(
      fakeConvocationRepository([convocationWith({ id: 'c1', type: 'training', status: 'open', date: '2026-08-01T18:00:00.000Z' })]),
      fakeMatchDetailsRepository(),
      fakeMatchEventRepository(),
      fakeOpponentRepository(),
    )

    const result = await useCase.execute({ teamId: 'team-1', now })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      attendanceConfirmationMissing: true,
      matchScoreMissing: false,
      goalAttributionMissing: false,
    })
  })

  it('never includes a cancelled convocation, for any of the three signals (AC-AL-06)', async () => {
    const useCase = new ListCoachAlertsUseCase(
      fakeConvocationRepository([
        convocationWith({ id: 'c1', type: 'training', status: 'cancelled', date: '2026-08-01T18:00:00.000Z' }),
        convocationWith({ id: 'c2', type: 'match', status: 'cancelled', date: '2026-08-01T18:00:00.000Z' }),
      ]),
      fakeMatchDetailsRepository([]),
      fakeMatchEventRepository(),
      fakeOpponentRepository(),
    )

    const result = await useCase.execute({ teamId: 'team-1', now })

    expect(result).toEqual([])
  })

  it('includes a closed match missing its score (AC-AL-07 — not conditioned on status === open)', async () => {
    const useCase = new ListCoachAlertsUseCase(
      fakeConvocationRepository([convocationWith({ id: 'c2', type: 'match', status: 'closed', date: '2026-08-01T18:00:00.000Z' })]),
      fakeMatchDetailsRepository([]),
      fakeMatchEventRepository(),
      fakeOpponentRepository(),
    )

    const result = await useCase.execute({ teamId: 'team-1', now })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ attendanceConfirmationMissing: false, matchScoreMissing: true, goalAttributionMissing: false })
  })

  it('resolves the opponent through the bulk team read, never a per-convocation lookup', async () => {
    const opponent: Opponent = { id: 'opponent-1', name: 'FC Voisin' }
    const findByTeamId = vi.fn(async () => [opponent])
    const convocation = convocationWith({ id: 'c2', type: 'match', status: 'closed', date: '2026-08-01T18:00:00.000Z' })
    const matchDetails = matchDetailsWith({ convocationId: 'c2', opponentId: 'opponent-1', goalsFor: null, goalsAgainst: null })
    const useCase = new ListCoachAlertsUseCase(
      fakeConvocationRepository([convocation]),
      fakeMatchDetailsRepository([matchDetails]),
      fakeMatchEventRepository(),
      fakeOpponentRepository([opponent], findByTeamId),
    )

    const result = await useCase.execute({ teamId: 'team-1', now })

    expect(findByTeamId).toHaveBeenCalledExactlyOnceWith('team-1')
    expect(result[0].opponent).toEqual(opponent)
  })

  it('cumulates signal A and signal B on the same convocation as ONE row (AC-AL-08)', async () => {
    const convocation = convocationWith({ id: 'c2', type: 'match', status: 'open', date: '2026-08-01T18:00:00.000Z' })
    const useCase = new ListCoachAlertsUseCase(
      fakeConvocationRepository([convocation]),
      fakeMatchDetailsRepository([]),
      fakeMatchEventRepository(),
      fakeOpponentRepository(),
    )

    const result = await useCase.execute({ teamId: 'team-1', now })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ attendanceConfirmationMissing: true, matchScoreMissing: true, goalAttributionMissing: false })
  })

  it('excludes signal C when goalsFor is 0, even with zero attributed goals (AC-AL-08)', async () => {
    const convocation = convocationWith({ id: 'c2', type: 'match', status: 'closed', date: '2026-08-01T18:00:00.000Z' })
    const matchDetails = matchDetailsWith({ convocationId: 'c2', goalsFor: 0, goalsAgainst: 3 })
    const useCase = new ListCoachAlertsUseCase(
      fakeConvocationRepository([convocation]),
      fakeMatchDetailsRepository([matchDetails]),
      fakeMatchEventRepository(),
      fakeOpponentRepository(),
    )

    const result = await useCase.execute({ teamId: 'team-1', now })

    expect(result).toEqual([])
  })

  it('counts only "goal" match_events toward attributedGoalCount, never other event types', async () => {
    const convocation = convocationWith({ id: 'c2', type: 'match', status: 'closed', date: '2026-08-01T18:00:00.000Z' })
    const matchDetails = matchDetailsWith({ convocationId: 'c2', goalsFor: 2, goalsAgainst: 0 })
    const events = [
      matchEventWith({ convocationId: 'c2', eventType: 'goal' }),
      matchEventWith({ convocationId: 'c2', eventType: 'yellow_card' }),
      matchEventWith({ convocationId: 'c2', eventType: 'penalty_missed' }),
    ]
    const useCase = new ListCoachAlertsUseCase(
      fakeConvocationRepository([convocation]),
      fakeMatchDetailsRepository([matchDetails]),
      fakeMatchEventRepository(events),
      fakeOpponentRepository(),
    )

    const result = await useCase.execute({ teamId: 'team-1', now })

    expect(result[0]).toMatchObject({ attributedGoalCount: 1, goalAttributionMissing: true })
  })

  it('sorts the resulting alerts oldest-first', async () => {
    const older = convocationWith({ id: 'older', type: 'training', status: 'open', date: '2026-07-01T18:00:00.000Z' })
    const newer = convocationWith({ id: 'newer', type: 'training', status: 'open', date: '2026-08-10T18:00:00.000Z' })
    const useCase = new ListCoachAlertsUseCase(
      fakeConvocationRepository([newer, older]),
      fakeMatchDetailsRepository(),
      fakeMatchEventRepository(),
      fakeOpponentRepository(),
    )

    const result = await useCase.execute({ teamId: 'team-1', now })

    expect(result.map((item) => item.convocation.id)).toEqual(['older', 'newer'])
  })

  // AC-AL-21 — bounded number of round trips, independent of convocation
  // count: exactly one call each to findByConvocations (x2) and
  // findByTeamId, regardless of how many convocations there are.
  it('performs exactly one bulk read per repository, regardless of how many convocations exist', async () => {
    const manyConvocations = Array.from({ length: 40 }, (_, index) =>
      convocationWith({ id: `match-${index}`, type: 'match', status: 'open', date: '2026-08-01T18:00:00.000Z' }),
    )
    const matchDetailsFindByConvocations = vi.fn(async () => [])
    const matchEventFindByConvocations = vi.fn(async () => [])
    const opponentFindByTeamId = vi.fn(async () => [])
    const useCase = new ListCoachAlertsUseCase(
      fakeConvocationRepository(manyConvocations),
      fakeMatchDetailsRepository([], matchDetailsFindByConvocations),
      fakeMatchEventRepository([], matchEventFindByConvocations),
      fakeOpponentRepository([], opponentFindByTeamId),
    )

    await useCase.execute({ teamId: 'team-1', now })

    expect(matchDetailsFindByConvocations).toHaveBeenCalledOnce()
    expect(matchEventFindByConvocations).toHaveBeenCalledOnce()
    expect(opponentFindByTeamId).toHaveBeenCalledOnce()
  })

  it('only requests match details/events for convocations of type "match"', async () => {
    const findByConvocationsDetails = vi.fn(async () => [])
    const findByConvocationsEvents = vi.fn(async () => [])
    const convocations = [
      convocationWith({ id: 'training-1', type: 'training' }),
      convocationWith({ id: 'match-1', type: 'match' }),
      convocationWith({ id: 'meeting-1', type: 'meeting' }),
    ]
    const useCase = new ListCoachAlertsUseCase(
      fakeConvocationRepository(convocations),
      fakeMatchDetailsRepository([], findByConvocationsDetails),
      fakeMatchEventRepository([], findByConvocationsEvents),
      fakeOpponentRepository(),
    )

    await useCase.execute({ teamId: 'team-1', now })

    expect(findByConvocationsDetails).toHaveBeenCalledExactlyOnceWith(['match-1'])
    expect(findByConvocationsEvents).toHaveBeenCalledExactlyOnceWith(['match-1'])
  })
})
