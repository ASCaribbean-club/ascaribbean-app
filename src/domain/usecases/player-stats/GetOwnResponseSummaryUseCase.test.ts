import { describe, expect, it, vi } from 'vitest'
import type { ResponseSummary } from '@domain/entities/response-summary'
import type { ConvocationResponseRepository } from '@domain/repositories/convocation-response-repository'
import { GetOwnResponseSummaryUseCase } from './GetOwnResponseSummaryUseCase'

function fakeConvocationResponseRepository(overrides: Partial<ConvocationResponseRepository> = {}): ConvocationResponseRepository {
  return {
    upsert: async (response) => ({ id: 'response-1', ...response }),
    findByConvocationAndUser: async () => null,
    findByConvocation: async () => [],
    findByConvocations: async () => [],
    getOwnResponseSummary: async () => ({ convocatedCount: 0, respondedCount: 0 }),
    ...overrides,
  }
}

describe('GetOwnResponseSummaryUseCase', () => {
  it('delegates to ConvocationResponseRepository.getOwnResponseSummary with no argument (AC-02 — no userId to falsify)', async () => {
    const getOwnResponseSummary = vi.fn(async () => ({ convocatedCount: 20, respondedCount: 15 }) as ResponseSummary)
    const useCase = new GetOwnResponseSummaryUseCase(fakeConvocationResponseRepository({ getOwnResponseSummary }))

    const result = await useCase.execute()

    expect(getOwnResponseSummary).toHaveBeenCalledExactlyOnceWith()
    expect(result).toEqual({ convocatedCount: 20, respondedCount: 15 })
  })

  it('returns a zero-denominator summary as-is, unmodified (AC-PS-17 is handled by the policy, not here)', async () => {
    const useCase = new GetOwnResponseSummaryUseCase(fakeConvocationResponseRepository())

    await expect(useCase.execute()).resolves.toEqual({ convocatedCount: 0, respondedCount: 0 })
  })
})
