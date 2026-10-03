// `get_club_overview()` RPC return value (one row, two integers) — Dto
// convention (CLAUDE.md §4). See
// supabase/migrations/20261003123356_get_club_overview_rpc.sql. Integers
// only by contract (AC-DH-19).
export interface ClubOverviewDto {
  sections_count: number
  members_count: number
}
