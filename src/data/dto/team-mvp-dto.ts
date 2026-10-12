// RPC return (get_team_mvp, supabase/migrations/20261012093753_get_team_mvp_rpc.sql):
// one row per current MVP — candidate id only, no voter identity (AC-PV-10).
export interface TeamMvpDto {
  user_id: string
}
