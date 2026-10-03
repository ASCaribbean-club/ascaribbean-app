import type { ClubNews } from '@domain/entities/club-news'
import type { CreatableClubNewsStatus } from '@domain/usecases/news/CreateClubNewsUseCase'
import { toDateInputValue } from './date-input'

// Shared by the backoffice dialog (NewsFormDialog) and the mobile Dirigeant
// editor (specs/mobile-dirigeant-habilite.md §4): one form shape, one
// mapping from a ClubNews row, so the two screens cannot drift.
export interface NewsFormValues {
  title: string
  details: string
  // 'draft' or 'published' only — 'archived' is reached exclusively through
  // the backoffice "Supprimer" action (ArchiveClubNewsUseCase).
  status: CreatableClubNewsStatus
  publishedAt: string // yyyy-mm-dd, native <input type="date"> value — may be '' when status is 'draft'
  expiresAt: string // yyyy-mm-dd or '' (optional)
  link: string // free text or '' (optional)
}

export const EMPTY_NEWS_FORM_VALUES: NewsFormValues = {
  title: '',
  details: '',
  status: 'published',
  publishedAt: '',
  expiresAt: '',
  link: '',
}

export function toNewsFormValues(news: ClubNews | null): NewsFormValues {
  if (!news) return EMPTY_NEWS_FORM_VALUES
  return {
    title: news.title,
    details: news.details,
    // An 'archived' row is never opened in a form; the 'draft' fallback only
    // satisfies the type system.
    status: news.status === 'draft' || news.status === 'published' ? news.status : 'draft',
    publishedAt: news.publishedAt ? toDateInputValue(new Date(news.publishedAt)) : '',
    expiresAt: news.expiresAt ? toDateInputValue(new Date(news.expiresAt)) : '',
    link: news.link ?? '',
  }
}
