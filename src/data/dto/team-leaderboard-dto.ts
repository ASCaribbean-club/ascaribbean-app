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

// `get_team_presence_leaderboard` RPC return value — Dto convention. See
// supabase/migrations/20261002174659_team_presence_leaderboard_rpc.sql.
export interface TeamPresenceLeaderboardPlayerDto {
  user_id: string
  full_name: string
  validated_count: number
  present_count: number
  convoked_count: number
  responded_count: number
}
