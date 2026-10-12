import { describe, expect, it, vi } from 'vitest'
import { GetConvocationResponseCountsUseCase } from './GetConvocationResponseCountsUseCase'

describe('GetConvocationResponseCountsUseCase', () => {
  it('returns the counts of the requested convocation', async () => {
    const repository = { countForConvocations: vi.fn().mockResolvedValue({ c1: { present: 3, absent: 1, pending: 4 } }) }
    await expect(new GetConvocationResponseCountsUseCase(repository).execute('c1')).resolves.toEqual({ present: 3, absent: 1, pending: 4 })
    expect(repository.countForConvocations).toHaveBeenCalledWith(['c1'])
  })

  it('falls back to zeros when the convocation is out of scope', async () => {
    const repository = { countForConvocations: vi.fn().mockResolvedValue({}) }
    await expect(new GetConvocationResponseCountsUseCase(repository).execute('c1')).resolves.toEqual({ present: 0, absent: 0, pending: 0 })
  })
})
