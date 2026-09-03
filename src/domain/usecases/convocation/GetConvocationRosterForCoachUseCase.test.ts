import { describe, expect, it } from 'vitest'
import type { ConvocationResponse } from '../../entities/convocation'
import type { ConvocationResponderStatus, ConvocationRespondersRepository } from '../../repositories/convocation-responders-repository'
import type { ConvocationResponseRepository } from '../../repositories/convocation-response-repository'
import { GetConvocationRosterForCoachUseCase } from './GetConvocationRosterForCoachUseCase'

// In-memory fakes, same pattern as AssembleConvocationDetailFieldsUseCase.test.ts —
// no Supabase mock needed, domain/ is plain TypeScript.
function fakeConvocationRespondersRepository(roster: ConvocationResponderStatus[]): ConvocationRespondersRepository {
  return {
    listForConvocation: async () => roster,
  }
}

function fakeConvocationResponseRepository(responses: ConvocationResponse[]): ConvocationResponseRepository {
  return {
    upsert: async (response) => ({ id: 'r1', ...response }),
    findByConvocationAndUser: async () => null,
    findByConvocation: async () => responses,
  }
}

function response(userId: string, status: ConvocationResponse['status']): ConvocationResponse {
  return {
    id: `response-${userId}`,
    convocationId: 'c1',
    userId,
    status,
    reason: null,
    respondedAt: '2026-08-30T10:00:00.000Z',
  }
}

describe('GetConvocationRosterForCoachUseCase', () => {
  it('defaults a convoked player with no ConvocationResponse row to pending (AC-MD-09)', async () => {
    const useCase = new GetConvocationRosterForCoachUseCase(
      fakeConvocationRespondersRepository([{ userId: 'player-1', hasResponded: false, displayName: 'Joueur 1', position: null }]),
      fakeConvocationResponseRepository([]),
    )

    const result = await useCase.execute('c1')

    expect(result.roster).toEqual([{ userId: 'player-1', displayName: 'Joueur 1', position: null, status: 'pending' }])
  })

  it('passes the responder position through unchanged', async () => {
    const useCase = new GetConvocationRosterForCoachUseCase(
      fakeConvocationRespondersRepository([{ userId: 'player-1', hasResponded: false, displayName: 'Joueur 1', position: 'goalkeeper' }]),
      fakeConvocationResponseRepository([]),
    )

    const result = await useCase.execute('c1')

    expect(result.roster).toEqual([{ userId: 'player-1', displayName: 'Joueur 1', position: 'goalkeeper', status: 'pending' }])
  })

  it('uses the real status for a roster entry with a matching ConvocationResponse', async () => {
    const useCase = new GetConvocationRosterForCoachUseCase(
      fakeConvocationRespondersRepository([{ userId: 'player-1', hasResponded: true, displayName: 'Joueur 1', position: null }]),
      fakeConvocationResponseRepository([response('player-1', 'absent')]),
    )

    const result = await useCase.execute('c1')

    expect(result.roster).toEqual([{ userId: 'player-1', displayName: 'Joueur 1', position: null, status: 'absent' }])
  })

  it('computes responseCounts from the assembled roster, counting a non-responder as pending (AC-MD-06, AC-MD-10, AC-CD-05)', async () => {
    const useCase = new GetConvocationRosterForCoachUseCase(
      fakeConvocationRespondersRepository([
        { userId: 'player-1', hasResponded: true, displayName: 'Joueur 1', position: null },
        { userId: 'player-2', hasResponded: true, displayName: 'Joueur 2', position: null },
        { userId: 'player-3', hasResponded: false, displayName: 'Joueur 3', position: null },
      ]),
      fakeConvocationResponseRepository([response('player-1', 'present'), response('player-2', 'absent')]),
    )

    const result = await useCase.execute('c1')

    expect(result.responseCounts).toEqual({ present: 1, absent: 1, pending: 1 })
  })

  it('returns an empty roster and zeroed counts when nobody is convoked', async () => {
    const useCase = new GetConvocationRosterForCoachUseCase(
      fakeConvocationRespondersRepository([]),
      fakeConvocationResponseRepository([]),
    )

    const result = await useCase.execute('c1')

    expect(result).toEqual({ roster: [], responseCounts: { present: 0, absent: 0, pending: 0 } })
  })
})
