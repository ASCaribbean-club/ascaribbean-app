// Raw shape of public.club_news, see
// supabase/migrations/20260904205258_club_news.sql. RLS already restricts
// what a SELECT can return: club_news_select_visible (published, non-
// expired, AC-AT-04) OR'd with club_news_select_admin (any row, admin only —
// specs/web-actus.md §2.3) — this DTO doesn't repeat either filter, it just
// describes the columns.
export interface ClubNewsRow {
  id: string
  title: string
  details: string
  link: string | null
  status: string
  published_at: string | null
  created_at: string
  created_by: string
  expires_at: string | null
}

// specs/web-actus.md §2.4 — insert payload for NewsRepositoryImpl.create().
// No `id`/`created_at`: both have DB defaults (gen_random_uuid(), now()).
export interface ClubNewsInsertRow {
  title: string
  details: string
  link: string | null
  status: string
  published_at: string | null
  created_by: string
  expires_at: string | null
}

// Update payload for NewsRepositoryImpl.update() — the 5 mockup fields plus
// `status` (draft/published, 2026-09-17 developer decision resolving
// PO-WA-02) — never `created_by` (§2.1, no author field in either dialog).
export interface ClubNewsUpdateRow {
  title: string
  details: string
  link: string | null
  status: string
  published_at: string | null
  expires_at: string | null
}
