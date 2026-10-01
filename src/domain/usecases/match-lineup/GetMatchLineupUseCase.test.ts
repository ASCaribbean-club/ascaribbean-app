import { describe, expect, it } from 'vitest'
import type { MatchLineup } from '../../entities/match-lineup'
import type { MatchLineupRepository } from '../../repositories/match-lineup-repository'
import { GetMatchLineupUseCase } from './GetMatchLineupUseCase'

describe('GetMatchLineupUseCase', () => {
  it('returns the lineup from the repository', async () => {
    const lineup: MatchLineup = { convocationId: 'c1', formation: '4-4-2', placements: [] }
    const repo: MatchLineupRepository = { findByConvocationId: async () => lineup, save: async () => {} }
    expect(await new GetMatchLineupUseCase(repo).execute('c1')).toBe(lineup)
  })

  it('returns null when there is none (AC-MC-14)', async () => {
    const repo: MatchLineupRepository = { findByConvocationId: async () => null, save: async () => {} }
    expect(await new GetMatchLineupUseCase(repo).execute('c1')).toBeNull()
  })
})
