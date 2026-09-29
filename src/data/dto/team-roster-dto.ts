// `get_team_roster` RPC return value, not a table/view row — XxxDto
// convention (CLAUDE.md §4), same shape as CoachDto for the sibling
// get_team_coaches RPC (data/dto/coach-dto.ts). See
// supabase/migrations/<timestamp>_coach_team_stats_get_team_roster.sql.
export interface TeamRosterPlayerDto {
  user_id: string
  full_name: string
}
