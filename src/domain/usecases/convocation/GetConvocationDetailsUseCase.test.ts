import { describe, expect, it } from 'vitest'
import type { Convocation, ConvocationType } from '../../entities/convocation'
import type { MatchDetails } from '../../entities/match-details'
import type { MeetingDetails } from '../../entities/meeting-details'
import type { MatchDetailsRepository } from '../../repositories/match-details-repository'
import type { MeetingDetailsRepository } from '../../repositories/meeting-details-repository'
import { GetConvocationDetailsUseCase } from './GetConvocationDetailsUseCase'

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

// In-memory fakes, same pattern as can.test.ts / convocation-closure.test.ts
// — no Supabase mock needed, domain/ is plain TypeScript.
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
  }
}

describe('GetConvocationDetailsUseCase', () => {
  it('routes a meeting convocation to MeetingDetailsRepository', async () => {
    const meetingRecord: MeetingDetails = { convocationId: 'c1', title: 'Réunion staff', agenda: ['Contexte'] }
    const useCase = new GetConvocationDetailsUseCase(
      fakeMeetingDetailsRepository(meetingRecord),
      fakeMatchDetailsRepository(null),
    )

    await expect(useCase.execute(convocationOfType('meeting'))).resolves.toBe(meetingRecord)
  })

  it('routes a match convocation to MatchDetailsRepository', async () => {
    const matchRecord: MatchDetails = {
      convocationId: 'c1',
      opponentId: 'opponent-1',
      isHome: true,
      meetingPointTime: '2026-09-01T16:30:00.000Z',
      meetingPointLocation: 'Vestiaires',
      goalsFor: null,
      goalsAgainst: null,
    }
    const useCase = new GetConvocationDetailsUseCase(
      fakeMeetingDetailsRepository(null),
      fakeMatchDetailsRepository(matchRecord),
    )

    await expect(useCase.execute(convocationOfType('match'))).resolves.toBe(matchRecord)
  })

  it('throws for a training convocation — no details repository configured yet', async () => {
    const useCase = new GetConvocationDetailsUseCase(
      fakeMeetingDetailsRepository(null),
      fakeMatchDetailsRepository(null),
    )

    await expect(useCase.execute(convocationOfType('training'))).rejects.toThrow(
      'No details repository configured for convocation type: training',
    )
  })

  it('throws on an unhandled type — exercises the exhaustive `never` compile-time guard at runtime', async () => {
    const useCase = new GetConvocationDetailsUseCase(
      fakeMeetingDetailsRepository(null),
      fakeMatchDetailsRepository(null),
    )
    const bogusConvocation = convocationOfType('meeting')
    // @ts-expect-error — deliberately bypassing the type system to reach the
    // `default` branch; this can only happen in practice via a DB value the
    // TS union doesn't know about yet.
    bogusConvocation.type = 'other'

    await expect(useCase.execute(bogusConvocation)).rejects.toThrow('Unhandled convocation type: other')
  })
})