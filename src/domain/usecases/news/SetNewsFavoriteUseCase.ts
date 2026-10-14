import type { NewsFavoriteRepository } from '../../repositories/news-favorite-repository'

export interface SetNewsFavoriteInput {
  userId: string
  newsId: string
  isFavorite: boolean
}

// Stars or un-stars a news item for the member. Open to every role on their
// own bookmarks, so there is no authorization lookup: RLS only lets a member
// touch rows where user_id = auth.uid().
export class SetNewsFavoriteUseCase {
  private readonly newsFavoriteRepository: NewsFavoriteRepository

  constructor(newsFavoriteRepository: NewsFavoriteRepository) {
    this.newsFavoriteRepository = newsFavoriteRepository
  }

  async execute({ userId, newsId, isFavorite }: SetNewsFavoriteInput): Promise<void> {
    if (isFavorite) {
      await this.newsFavoriteRepository.add(userId, newsId)
    } else {
      await this.newsFavoriteRepository.remove(userId, newsId)
    }
  }
}
