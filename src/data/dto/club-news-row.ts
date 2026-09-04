// Raw shape of public.club_news, see
// supabase/migrations/20260904100000_club_news.sql. RLS already restricts
// what a SELECT can return to published, non-expired rows (AC-AT-04) — this
// DTO doesn't repeat that filter, it just describes the columns.
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
