import type { ClubNews } from '../../entities/club-news'
import type { NewsRepository } from '../../repositories/news-repository'

// Get the club-wide news feed (already published + not expired — RLS
// mirror, see domain/policies/news-visibility.ts). No input: identical for
// every role, no team/section/season scope (specs/actus.md §3).
export class ListPublishedNewsUseCase {
  private readonly newsRepository: NewsRepository

  constructor(newsRepository: NewsRepository) {
    this.newsRepository = newsRepository
  }

  async execute(): Promise<ClubNews[]> {
    return this.newsRepository.listPublished()
  }
}
