import { describe, expect, it, vi } from 'vitest'
import type { NewsFavoriteRepository } from '../../repositories/news-favorite-repository'
import { SetNewsFavoriteUseCase } from './SetNewsFavoriteUseCase'

function makeRepository(): NewsFavoriteRepository {
  return {
    listFavoriteNewsIds: vi.fn(),
    add: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  }
}

describe('SetNewsFavoriteUseCase', () => {
  it('adds the favorite when isFavorite is true', async () => {
    const repository = makeRepository()

    await new SetNewsFavoriteUseCase(repository).execute({ userId: 'user-1', newsId: 'news-1', isFavorite: true })

    expect(repository.add).toHaveBeenCalledWith('user-1', 'news-1')
    expect(repository.remove).not.toHaveBeenCalled()
  })

  it('removes the favorite when isFavorite is false', async () => {
    const repository = makeRepository()

    await new SetNewsFavoriteUseCase(repository).execute({ userId: 'user-1', newsId: 'news-1', isFavorite: false })

    expect(repository.remove).toHaveBeenCalledWith('user-1', 'news-1')
    expect(repository.add).not.toHaveBeenCalled()
  })
})
