// specs/player-stats.md §6.3 — backs get_my_response_summary() (RPC,
// SECURITY INVOKER — convocation_responses_select_own_or_coach already
// grants a player SELECT on their own rows, §6.2, verified against
// supabase/migrations/20260903205143_convocation_responses_select_own_or_coach.sql
// before relying on it). convocatedCount is the denominator (past,
// non-cancelled convocations of the player's CURRENT teams — inherits the
// ex-PO-CV-05 limitation: a player who left a team disappears from past
// counts, §6.1/PO-PS-10, not fixed here). respondedCount counts
// convocation_responses of status 'present' or 'absent' only — 'pending' is
// not a response.
export interface ResponseSummary {
  convocatedCount: number
  respondedCount: number
}
