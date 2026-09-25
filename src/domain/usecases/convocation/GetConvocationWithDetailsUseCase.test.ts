import { describe, expect, it } from 'vitest'
import type { Convocation, ConvocationType } from '../../entities/convocation'
import type { MatchDetails } from '../../entities/match-details'
import type { MeetingDetails } from '../../entities/meeting-details'
import type { Opponent } from '../../entities/opponent'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { MatchDetailsRepository } from '../../repositories/match-details-repository'
import type { MeetingDetailsRepository } from '../../repositories/meeting-details-repository'
import type { OpponentRepository } from '../../repositories/opponent-repository'
import { AssembleConvocationDetailFieldsUseCase } from './AssembleConvocationDetailFieldsUseCase'
import { GetConvocationDetailsUseCase } from './GetConvocationDetailsUseCase'
import { GetConvocationWithDetailsUseCase } from './GetConvocationWithDetailsUseCase'

function convocationOfType(type: ConvocationType): Convocation {
  return {
    id: 'c1',
    teamId: 'team-1',
    type,
    date: '2026-09-01T18:00:00.000Z',
    location: 'Stade municipal',
    status: 'open',
    closedAt: null,
    closedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    createdBy: 'coach-1',
  }
}

// In-memory fakes, same pattern as the sibling use case tests in this
// folder — no Supabase mock needed, domain/ is plain TypeScript. Real
// GetConvocationDetailsUseCase/AssembleConvocationDetailFieldsUseCase
// instances (not stubs) are wired in below: both are concrete classes with
// private constructor fields, so a plain object literal wouldn't satisfy
// their type — and exercising the real chain is exactly what catches a
// regression like the one this file fixes.
function fakeConvocationRepository(record: Convocation | null): ConvocationRepository {
  return {
    listForTeam: async () => [],
    findById: async () => record,
    createTraining: async () => { throw new Error('not used in this test') },
    createMatch: async () => { throw new Error('not used in this test') },
    createMeeting: async () => { throw new Error('not used in this test') },
    updateArrangements: async () => { throw new Error('not used in this test') },
  }
}

function fakeMeetingDetailsRepository(record: MeetingDetails | null): MeetingDetailsRepository {
  return {
    upsert: async (details) => details,
    findByConvocationId: async () => record,
  }
}

function fakeMatchDetailsRepository(record: MatchDetails | null): MatchDetailsRepository {
  return {
    upsert: async (details) => details,
    findByConvocationId: async () => record,
    recordScore: async (convocationId, goalsFor, goalsAgainst) => ({ ...(record as MatchDetails), convocationId, goalsFor, goalsAgainst }),
    // Not exercised by GetConvocationWithDetailsUseCase (a read-only use
    // case) — present only to satisfy the interface.
    updateArrangements: async (convocationId, arrangements) => ({ convocationId, opponentId: '', ...arrangements }),
  }
}

function fakeOpponentRepository(record: Opponent | null): OpponentRepository {
  return {
    findByTeamId: async () => [],
    findById: async () => record,
    create: async (name) => ({ id: 'opponent-1', name }),
  }
}

function buildUseCase(options: {
  convocation: Convocation | null
  meetingRecord?: MeetingDetails | null
  matchRecord?: MatchDetails | null
  opponent?: Opponent | null
}) {
  const getConvocationDetailsUseCase = new GetConvocationDetailsUseCase(
    fakeMeetingDetailsRepository(options.meetingRecord ?? null),
    fakeMatchDetailsRepository(options.matchRecord ?? null),
  )
  const assembleConvocationDetailFieldsUseCase = new AssembleConvocationDetailFieldsUseCase(
    fakeOpponentRepository(options.opponent ?? null),
  )
  return new GetConvocationWithDetailsUseCase(
    fakeConvocationRepository(options.convocation),
    getConvocationDetailsUseCase,
    assembleConvocationDetailFieldsUseCase,
  )
}

describe('GetConvocationWithDetailsUseCase', () => {
  it('returns null when the convocation does not exist or is outside RLS scope (AC-MD-01)', async () => {
    const useCase = buildUseCase({ convocation: null })

    await expect(useCase.execute('missing')).resolves.toBeNull()
  })

  it('renders the identity block alone for a training convocation, without throwing (AC-MD-02)', async () => {
    const convocation = convocationOfType('training')
    const useCase = buildUseCase({ convocation })

    await expect(useCase.execute('c1')).resolves.toEqual({
      convocation,
      matchDetails: null,
      opponent: null,
      meetingDetails: null,
    })
  })

  it('assembles matchDetails + resolved opponent for a match convocation', async () => {
    const convocation = convocationOfType('match')
    const matchRecord: MatchDetails = {
      convocationId: 'c1',
      opponentId: 'opponent-1',
      isHome: true,
      meetingPointTime: '2026-09-01T16:30:00.000Z',
      meetingPointLocation: 'Vestiaires',
      goalsFor: null,
      goalsAgainst: null,
    }
    const opponent: Opponent = { id: 'opponent-1', name: 'FC Rival' }
    const useCase = buildUseCase({ convocation, matchRecord, opponent })

    await expect(useCase.execute('c1')).resolves.toEqual({
      convocation,
      matchDetails: matchRecord,
      opponent,
      meetingDetails: null,
    })
  })

  it('assembles meetingDetails for a meeting convocation', async () => {
    const convocation = convocationOfType('meeting')
    const meetingRecord: MeetingDetails = { convocationId: 'c1', title: 'Réunion staff', agenda: ['Contexte'] }
    const useCase = buildUseCase({ convocation, meetingRecord })

    await expect(useCase.execute('c1')).resolves.toEqual({
      convocation,
      matchDetails: null,
      opponent: null,
      meetingDetails: meetingRecord,
    })
  })

  it.each<ConvocationType>(['match', 'meeting'])(
    'throws NotFoundError with the convocation id interpolated when a %s convocation has no satellite row',
    async (type) => {
      const convocation = convocationOfType(type)
      const useCase = buildUseCase({ convocation })

      await expect(useCase.execute('c1')).rejects.toThrow('Details not found for convocation: c1')
    },
  )
})
