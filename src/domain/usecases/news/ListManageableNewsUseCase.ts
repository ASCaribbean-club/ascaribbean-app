import type { ClubNews } from '../../entities/club-news'
import { isNewsManageable } from '../../policies/news-management-rules'
import type { NewsRepository } from '../../repositories/news-repository'

// specs/mobile-dirigeant-habilite.md §1.3 — the Dirigeant's console list:
// drafts and published rows (expired included) of all authors, never
// 'archived'. RLS (club_news_select_authorized_officer) already refuses
// archived rows to that role; the filter here additionally covers a
// multi-role admin + officer whose admin policy would return them.
export class ListManageableNewsUseCase {
  constructor(private readonly newsRepository: NewsRepository) {}

  async execute(): Promise<ClubNews[]> {
    const all = await this.newsRepository.listAll()
    return all.filter(isNewsManageable)
  }
}
