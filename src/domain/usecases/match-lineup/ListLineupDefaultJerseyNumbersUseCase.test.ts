import { describe, expect, it } from 'vitest'
import type { MatchLineupRepository } from '../../repositories/match-lineup-repository'
import { ListLineupDefaultJerseyNumbersUseCase } from './ListLineupDefaultJerseyNumbersUseCase'

describe('ListLineupDefaultJerseyNumbersUseCase', () => {
  it('returns the default numbers of the repository for the convocation (AC-MC-26)', async () => {
    const repo: MatchLineupRepository = {
      findByConvocationId: async () => null,
      save: async () => {},
      listDefaultJerseyNumbers: async (convocationId): Promise<Record<string, number>> => (convocationId === 'c1' ? { a: 10 } : {}),
    }
    expect(await new ListLineupDefaultJerseyNumbersUseCase(repo).execute('c1')).toEqual({ a: 10 })
    expect(await new ListLineupDefaultJerseyNumbersUseCase(repo).execute('c2')).toEqual({})
  })
})
