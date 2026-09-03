import { describe, expect, it } from 'vitest'
import type { Convocation, ConvocationType } from '../../entities/convocation'
import type { MatchDetails } from '../../entities/match-details'
import type { MeetingDetails } from '../../entities/meeting-details'
import type { Opponent } from '../../entities/opponent'
import type { OpponentRepository } from '../../repositories/opponent-repository'
import { AssembleConvocationDetailFieldsUseCase } from './AssembleConvocationDetailFieldsUseCase'

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

// In-memory fake, same pattern as GetConvocationDetailsUseCase.test.ts —
// no Supabase mock needed, domain/ is plain TypeScript.
function fakeOpponentRepository(record: Opponent | null): OpponentRepository {
  return {
    findByTeamId: async () => [],
    findById: async () => record,
    create: async (name) => ({ id: 'opponent-1', name }),
  }
}

describe('AssembleConvocationDetailFieldsUseCase', () => {
  it('maps a meeting convocation to meetingDetails only', async () => {
    const meetingRecord: MeetingDetails = { convocationId: 'c1', title: 'Réunion staff', agenda: ['Contexte'] }
    const useCase = new AssembleConvocationDetailFieldsUseCase(fakeOpponentRepository(null))

    await expect(useCase.execute(convocationOfType('meeting'), meetingRecord)).resolves.toEqual({
      matchDetails: null,
      opponent: null,
      meetingDetails: meetingRecord,
    })
  })

  it('maps a match convocation to matchDetails + resolved opponent', async () => {
    const matchRecord: MatchDetails = {
      convocationId: 'c1',
      opponentId: 'opponent-1',
      isHome: true,
      meetingPointTime: '2026-09-01T16:30:00.000Z',
      meetingPointLocation: 'Vestiaires',
    }
    const opponent: Opponent = { id: 'opponent-1', name: 'FC Rival' }
    const useCase = new AssembleConvocationDetailFieldsUseCase(fakeOpponentRepository(opponent))

    await expect(useCase.execute(convocationOfType('match'), matchRecord)).resolves.toEqual({
      matchDetails: matchRecord,
      opponent,
      meetingDetails: null,
    })
  })

  it('returns all-null fields for a match convocation with no details row yet', async () => {
    const useCase = new AssembleConvocationDetailFieldsUseCase(fakeOpponentRepository(null))

    await expect(useCase.execute(convocationOfType('match'), null)).resolves.toEqual({
      matchDetails: null,
      opponent: null,
      meetingDetails: null,
    })
  })

  it('returns all-null fields for a training convocation', async () => {
    const useCase = new AssembleConvocationDetailFieldsUseCase(fakeOpponentRepository(null))

    await expect(useCase.execute(convocationOfType('training'), null)).resolves.toEqual({
      matchDetails: null,
      opponent: null,
      meetingDetails: null,
    })
  })

  it('throws on an unhandled type — exercises the exhaustive `never` compile-time guard at runtime', async () => {
    const useCase = new AssembleConvocationDetailFieldsUseCase(fakeOpponentRepository(null))
    const bogusConvocation = convocationOfType('meeting')
    // @ts-expect-error — deliberately bypassing the type system to reach the
    // `default` branch; this can only happen in practice via a DB value the
    // TS union doesn't know about yet.
    bogusConvocation.type = 'other'

    await expect(useCase.execute(bogusConvocation, null)).rejects.toThrow('Unhandled convocation type: other')
  })
})
