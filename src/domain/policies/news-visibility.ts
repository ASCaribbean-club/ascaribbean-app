import type { ClubNews, ClubNewsTag } from '../entities/club-news'

/**
 * A news item is visible iff it is published AND not expired.
 * ⚠️ MIRRORED IN SQL — see policy club_news_select_visible
 * (supabase/migrations/20260904100000_club_news.sql). SQL is the actual
 * security boundary; this function exists for readability, testing, and
 * potential UI reuse — it never guards access on its own.
 *
 * `now` is passed in rather than read internally (no `Date.now()` call
 * here) so the function stays pure and testable — same pattern as
 * `canPlayerRespond` (domain/policies/response-deadline.ts) and
 * `isConvocationComplete` (domain/policies/convocation-closure.ts).
 *
 * Comparison is strict (`>`): a news item whose expiresAt is exactly `now`
 * is no longer visible — same semantics on both sides of the mirror.
 */
export function isNewsVisible(news: ClubNews, now: Date): boolean {
  return (
    news.status === 'published' &&
    (news.expiresAt === null || new Date(news.expiresAt) > now)
  )
}

// Feed filter chips (docs/designs/actus v2): 'all' shows everything,
// including untagged items; any other value shows only that exact tag.
export type NewsTagFilter = 'all' | ClubNewsTag

export function matchesNewsTagFilter(news: Pick<ClubNews, 'tag'>, filter: NewsTagFilter): boolean {
  return filter === 'all' || news.tag === filter
}
