// `get_team_coaches` is an RPC return value, not a table/view row — XxxDto
// convention (CLAUDE.md §4), see
// supabase/migrations/20260904083306_profile_team_coaches.sql.
export interface CoachDto {
  user_id: string
  full_name: string
}
