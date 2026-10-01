// `get_team_availability` RPC return value, not a table/view row — XxxDto
// convention (CLAUDE.md §4). See
// supabase/migrations/20261001175044_player_unavailability.sql.
export interface TeamAvailabilityDto {
  user_id: string
  full_name: string
  // Coach caller: 'available' | 'medical' | 'suspended'.
  // Player caller: 'available' | 'unavailable' | 'suspended'.
  status: string
  starts_on: string | null
  ends_on: string | null
}
