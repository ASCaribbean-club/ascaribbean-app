// `get_convocation_responders` is an RPC return value, not a table/view row
// — XxxDto convention (ARCHITECTURE.md §4), even though it's backed
// internally by the `convocation_responders` view joined to `users`. One
// round trip: roster membership, `has_responded` boolean (never
// `status`/`reason`), and display name together (see the function's own
// comment in supabase/migrations/20260901120018_convocation_responder_visibility_correction.sql).
export interface ConvocationResponderDto {
  user_id: string
  display_name: string
  has_responded: boolean
  // Widened in 20260901125851_user_player_position.sql — a position is not
  // sensitive the way status/reason are, so extending this already-narrow
  // RPC with it doesn't reopen the AC-MD-08 leak the RPC exists to close.
  position: string | null
}
