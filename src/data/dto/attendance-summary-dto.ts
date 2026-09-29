// RPC-shaped, not a raw table row — `Dto` suffix per CLAUDE.md §4 ("RPC
// return value, inline join/aggregation with no view behind it"). Backs
// get_my_attendance_summary() — see
// supabase/migrations/20260928120000_player_stats_summary_rpcs.sql. Exactly
// two columns, no more — AC-PS-06 requires the RESPONSE SHAPE itself to
// carry no `note`/`absence_validity`/`validated_by`/row id, not just the
// rendered UI, so this DTO structurally cannot gain one of those fields by
// accident (a future column added to the RPC still has to be added HERE
// before anything downstream could read it).
export interface AttendanceSummaryDto {
  validated_count: number
  present_count: number
}
