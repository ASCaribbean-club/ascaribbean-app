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
  // AC-MC-27 — number worn for this match, from the SLOT (never joined from
  // memberships, AC-MC-29). null = none.
  jersey_number: number | null
}

// `get_lineup_default_jersey_numbers(p_convocation_id)` — one row per player
// of the convoked pool that has a number on the membership of the season
// containing the convocation's date (AC-MC-26, PO-MC-16). Nothing else of
// the membership is returned.
export interface LineupDefaultJerseyNumberDto {
  user_id: string
  jersey_number: number
}
