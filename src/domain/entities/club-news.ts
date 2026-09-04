// Backs public.club_news (supabase/migrations/20260904100000_club_news.sql).
// specs/actus.md §2 — decisions already settled, not open for this pass:
// - publishedAt is the date shown to users, set when status flips to
//   'published'; createdAt is technical/audit only and is never displayed.
// - No eventDate field: a news item has no event date of its own (that's
//   what a Convocation has, not an Actus entry).
// - No seasonId column: a future "current season" filter is computed at
//   read time against current_season(), never stored on the row.
export type ClubNewsStatus = 'draft' | 'published' | 'archived'

export interface ClubNews {
  id: string
  title: string
  details: string
  link: string | null // e.g. external article, photo album — nullable, absence is a normal state
  status: ClubNewsStatus
  publishedAt: string | null // ISO — the date SHOWN to users, null until published
  createdAt: string // ISO — technical/audit only, never displayed
  createdBy: string // references users(id) — ordinary business data, symmetric with Convocation.createdBy
  expiresAt: string | null // ISO — null means no expiry
}
