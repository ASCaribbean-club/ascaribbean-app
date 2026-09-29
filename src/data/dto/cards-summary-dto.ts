// RPC-shaped, not a raw table row — `Dto` suffix per CLAUDE.md §4. Backs
// get_my_cards_count() — see
// supabase/migrations/20260929112002_player_stats_own_cards_rls.sql.
export interface CardsSummaryDto {
  yellow_count: number
  red_count: number
}
