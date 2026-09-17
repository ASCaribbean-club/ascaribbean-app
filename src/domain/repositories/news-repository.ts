import type { ClubNews } from '../entities/club-news'

// specs/web-actus.md §2.4 — "Une seule interface par ressource" — listAll()
// and the write methods are added HERE, not on a separate
// BackofficeNewsRepository. listPublished() is kept exactly as it was
// (AC-WA-09): the mobile feed's read path.
export interface NewsRepository {
  // Single method: no `now` parameter, because the temporal filter is
  // applied by RLS on Postgres (club_news_select_visible), not by a date
  // supplied by the client. No findById until a detail screen is specified
  // (ARCHITECTURE.md §12 point 9 — don't create ahead of need).
  listPublished(): Promise<ClubNews[]>

  // specs/web-actus.md §2.3/§3 — admin-only read of EVERY row (any status,
  // any expiry), backed by the new club_news_select_admin RLS policy. No
  // `now` parameter either — same reasoning as listPublished(), and this
  // read isn't filtered by time at all.
  listAll(): Promise<ClubNews[]>

  // specs/web-actus.md §2.4 — CreateClubNewsUseCase is the only caller,
  // never presentation/ directly (AC-WA-26).
  create(input: CreateClubNewsInput): Promise<ClubNews>

  // The 5 mockup fields plus `status` (draft/published, 2026-09-17 developer
  // decision resolving PO-WA-02) — UpdateClubNewsUseCase is the only caller.
  update(id: string, input: UpdateClubNewsInput): Promise<ClubNews>

  // 2026-09-17 developer decision (resolves PO-WA-06): soft "delete" — sets
  // status to 'archived', never removes the row. Backed by the SAME
  // club_news_update_admin RLS policy as update() (it's an UPDATE, not a
  // DELETE) — no new policy needed. ArchiveClubNewsUseCase is the only
  // caller.
  archive(id: string): Promise<ClubNews>
}

// Mirrors the entity minus what the database always derives itself
// (id, createdAt). status is included: CreateClubNewsUseCase decides
// between 'draft' and 'published' (never 'archived' — there is no
// applicative path to create an already-archived row).
export type CreateClubNewsInput = Omit<ClubNews, 'id' | 'createdAt'>

// The 5 mockup fields (§2, "Correspondance champs ↔ colonnes existantes")
// plus `status` — createdBy/createdAt are never part of an update, there is
// still no author field in either dialog.
export type UpdateClubNewsInput = Pick<ClubNews, 'title' | 'details' | 'link' | 'status' | 'publishedAt' | 'expiresAt'>
