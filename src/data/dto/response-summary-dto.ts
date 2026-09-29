// RPC-shaped, not a raw table row — `Dto` suffix per CLAUDE.md §4. Backs
// get_my_response_summary() — see
// supabase/migrations/20260928120000_player_stats_summary_rpcs.sql.
export interface ResponseSummaryDto {
  convocated_count: number
  responded_count: number
}
