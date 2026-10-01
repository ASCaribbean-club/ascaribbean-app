// `get_match_lineup(p_convocation_id)` is an RPC return value, not a table
// row — XxxDto convention (CLAUDE.md §4): one row per OCCUPIED slot, the
// formation repeated on each, display name joined server-side so a player
// never needs read access to public.users. The function returns no row at
// all before the visibility window opens for a player token (AC-MC-09) — see
// supabase/migrations/20261001075331_match_lineup.sql.
export interface MatchLineupSlotDto {
  formation: string
  slot_index: number
  user_id: string
  display_name: string
}
