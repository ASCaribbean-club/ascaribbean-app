import { describe, expect, it } from 'vitest'
import type { ConvocationResponse } from '../../entities/convocation'
import type { ConvocationResponseRepository } from '../../repositories/convocation-response-repository'
import { GetConvocationResponseByUserUseCase } from './GetConvocationResponseByUserUseCase'

// In-memory fake, same pattern as sibling use case tests in this folder —
// no Supabase mock needed, domain/ is plain TypeScript.
function fakeConvocationResponseRepository(response: ConvocationResponse | null): ConvocationResponseRepository {
  return {
    upsert: async (r) => ({ id: 'r1', ...r }),
    findByConvocationAndUser: async () => response,
    findByConvocation: async () => (response ? [response] : []),
  }
}

describe('GetConvocationResponseByUserUseCase', () => {
  it("returns the user's own ConvocationResponse when one exists (AC-MD-07)", async () => {
    const response: ConvocationResponse = {
      id: 'response-1',
      convocationId: 'c1',
      userId: 'player-1',
      status: 'present',
      reason: null,
      respondedAt: '2026-08-30T10:00:00.000Z',
    }
    const useCase = new GetConvocationResponseByUserUseCase(fakeConvocationResponseRepository(response))

    await expect(useCase.execute('c1', 'player-1')).resolves.toEqual(response)
  })

  it('returns null when the user has not responded yet — never an AttendanceRecord (AC-MD-07)', async () => {
    const useCase = new GetConvocationResponseByUserUseCase(fakeConvocationResponseRepository(null))

    await expect(useCase.execute('c1', 'player-1')).resolves.toBeNull()
  })
})
