// `get_team_leaderboard` RPC return value, not a table/view row — Dto
// convention (CLAUDE.md §4). See
// supabase/migrations/20261001161553_team_leaderboard_rpc.sql.
export interface TeamLeaderboardPlayerDto {
  user_id: string
  full_name: string
  goals_count: number
  yellow_count: number
  red_count: number
}
