import type { NewsFavoriteRepository } from '../../repositories/news-favorite-repository'

export class ListNewsFavoriteIdsUseCase {
  private readonly newsFavoriteRepository: NewsFavoriteRepository

  constructor(newsFavoriteRepository: NewsFavoriteRepository) {
    this.newsFavoriteRepository = newsFavoriteRepository
  }

  async execute(userId: string): Promise<string[]> {
    return this.newsFavoriteRepository.listFavoriteNewsIds(userId)
  }
}
