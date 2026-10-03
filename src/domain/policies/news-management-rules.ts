import type { ClubNews } from '../entities/club-news'
import { isNewsVisible } from './news-visibility'

// specs/mobile-dirigeant-habilite.md §1.3 — rules of the mobile news console.

export type NewsStatusFilter = 'all' | 'draft' | 'published'

// ⚠️ MIRRORED IN SQL — policies club_news_select_authorized_officer /
// club_news_update_authorized_officer
// (supabase/migrations/20261003123047_dirigeant_news_write_policies.sql):
// the officer only ever reads/edits 'draft' and 'published' rows. An
// 'archived' row is never listed nor editable on mobile, even for a
// multi-role admin + officer account whose admin policy would return it.
export function isNewsManageable(news: ClubNews): boolean {
  return news.status === 'draft' || news.status === 'published'
}

// "Publiées" includes the expired ones (PO-DH-16): the filter is on the
// stored status, the badge tells expired apart.
export function matchesNewsStatusFilter(news: Pick<ClubNews, 'status'>, filter: NewsStatusFilter): boolean {
  if (filter === 'all') return true
  return news.status === filter
}

export type NewsConsoleStatus = 'draft' | 'published' | 'expired'

// PO-DH-16 default: 'draft' if draft, else 'published' if visible, else
// 'expired'. Same logic as the backoffice NewsStatusBadge, kept here so the
// presentation only renders the result.
export function getNewsConsoleStatus(news: ClubNews, now: Date): NewsConsoleStatus {
  if (news.status === 'draft') return 'draft'
  return isNewsVisible(news, now) ? 'published' : 'expired'
}
