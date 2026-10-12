import { describe, expect, it, vi } from 'vitest'
import type { TeamMvpRepository } from '../../repositories/team-mvp-repository'
import { GetTeamMvpUseCase } from './GetTeamMvpUseCase'

describe('GetTeamMvpUseCase', () => {
  it('returns the repository ids for the given team and category', async () => {
    const getCurrentMvpIds = vi.fn().mockResolvedValue(['p1', 'p2'])
    const useCase = new GetTeamMvpUseCase({ getCurrentMvpIds } as TeamMvpRepository)

    await expect(useCase.execute({ teamId: 'team-1', categoryId: 'man_of_the_match' })).resolves.toEqual(['p1', 'p2'])
    expect(getCurrentMvpIds).toHaveBeenCalledWith('team-1', 'man_of_the_match')
  })
})
