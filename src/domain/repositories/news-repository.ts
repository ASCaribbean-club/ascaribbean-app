import type { ClubNews } from '../entities/club-news'

// Interface only — no implementation in this pass (specs/actus.md §2/§1,
// "not in this pass"). Slight name/entity mismatch accepted (ClubNews vs
// NewsRepository) — NewsRepository is the name settled on in the mentoring
// session that produced this spec.
export interface NewsRepository {
  // Single method: no `now` parameter, because the temporal filter is
  // applied by RLS on Postgres (club_news_select_visible), not by a date
  // supplied by the client. No findById until a detail screen is specified
  // (ARCHITECTURE.md §12 point 9 — don't create ahead of need).
  listPublished(): Promise<ClubNews[]>
}
