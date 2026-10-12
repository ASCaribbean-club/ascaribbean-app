// Backs public.club_news (supabase/migrations/20260904100000_club_news.sql).
// specs/actus.md §2 — decisions already settled, not open for this pass:
// - publishedAt is the date shown to users, set when status flips to
//   'published'; createdAt is technical/audit only and is never displayed.
// - No eventDate field: a news item has no event date of its own (that's
//   what a Convocation has, not an Actus entry).
// - No seasonId column: a future "current season" filter is computed at
//   read time against current_season(), never stored on the row.
export type ClubNewsStatus = 'draft' | 'published' | 'archived'

// Optional category shown as a badge and used by the feed's filter chips
// (docs/designs/actus, v2). Null = untagged: only shown under "Tout".
export const CLUB_NEWS_TAGS = ['club', 'equipes', 'boutique'] as const
export type ClubNewsTag = (typeof CLUB_NEWS_TAGS)[number]

export interface ClubNews {
  id: string
  title: string
  details: string
  tag: ClubNewsTag | null // nullable — an untagged news item is a normal state
  link: string | null // e.g. external article, photo album — nullable, absence is a normal state
  status: ClubNewsStatus
  publishedAt: string | null // ISO — the date SHOWN to users, null until published
  createdAt: string // ISO — technical/audit only, never displayed
  createdBy: string // references users(id) — ordinary business data, symmetric with Convocation.createdBy
  expiresAt: string | null // ISO — null means no expiry
}
