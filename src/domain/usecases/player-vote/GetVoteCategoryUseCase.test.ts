import { describe, expect, it, vi } from 'vitest'
import type { VoteCategory } from '../../entities/vote'
import type { VoteCategoryRepository } from '../../repositories/vote-category-repository'
import { GetVoteCategoryUseCase } from './GetVoteCategoryUseCase'

function fakeVoteCategoryRepository(category: VoteCategory | null): VoteCategoryRepository {
  return {
    findById: vi.fn(async () => category),
  }
}

describe('GetVoteCategoryUseCase', () => {
  it('returns the category for a known id', async () => {
    const category: VoteCategory = { id: 'man_of_the_match', label: 'Joueur du match' }
    const useCase = new GetVoteCategoryUseCase(fakeVoteCategoryRepository(category))

    await expect(useCase.execute({ categoryId: 'man_of_the_match' })).resolves.toEqual(category)
  })

  it('returns null for an unknown category id', async () => {
    const useCase = new GetVoteCategoryUseCase(fakeVoteCategoryRepository(null))

    await expect(useCase.execute({ categoryId: 'unknown' })).resolves.toBeNull()
  })

  it('delegates to the repository with the given category id', async () => {
    const findById = vi.fn(async () => null)
    const useCase = new GetVoteCategoryUseCase({ findById })

    await useCase.execute({ categoryId: 'man_of_the_match' })

    expect(findById).toHaveBeenCalledExactlyOnceWith('man_of_the_match')
  })
})
