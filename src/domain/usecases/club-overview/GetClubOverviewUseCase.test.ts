import { describe, expect, it } from 'vitest'
import type { ClubOverviewRepository } from '../../repositories/club-overview-repository'
import { GetClubOverviewUseCase } from './GetClubOverviewUseCase'

describe('GetClubOverviewUseCase', () => {
  it('returns the counters from the repository untouched', async () => {
    const repository: ClubOverviewRepository = { getOverview: async () => ({ sectionsCount: 4, membersCount: 120 }) }
    expect(await new GetClubOverviewUseCase(repository).execute()).toEqual({ sectionsCount: 4, membersCount: 120 })
  })

  it('propagates a repository error (e.g. a non-officer caller refused by the database)', async () => {
    const repository: ClubOverviewRepository = {
      getOverview: async () => {
        throw new Error('forbidden')
      },
    }
    await expect(new GetClubOverviewUseCase(repository).execute()).rejects.toThrow('forbidden')
  })
})
