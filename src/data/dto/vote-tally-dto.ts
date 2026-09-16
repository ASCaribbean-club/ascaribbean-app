// RPC-shaped, not a raw table row — `Dto` suffix per CLAUDE.md §4 ("RPC
// return value, inline join/aggregation with no view behind it"), same
// reasoning as ConvocationResponderDto backing get_convocation_responders.
// Mirrors the `convocation_responders` view + RPC precedent (AC-PV-10,
// docs/convocation_visibility_rls_correction.md §2.1): whatever SQL
// eventually backs this (a view + wrapping RPC, or a single SECURITY
// DEFINER function) MUST aggregate server-side — this DTO has no voter-id
// column to strip client-side, by construction.
//
// One row per candidate (resolved) — see
// supabase/migrations/20260916171955_player_vote_schema.sql's
// get_vote_tally(). No convocation_id/category_id columns here: the caller
// (VoteTallyRepositoryImpl.getTally) already knows both — they're its own
// method parameters — so the mapper takes them directly instead of
// round-tripping them through the RPC only to read them back off row 0.
export interface VoteTallyDto {
  candidate_id: string
  candidate_display_name: string
  vote_count: number
  total_eligible_voters: number
}
