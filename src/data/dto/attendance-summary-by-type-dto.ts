// RPC-shaped, not a raw table row — `Dto` suffix per CLAUDE.md §4. Backs
// get_my_attendance_summary_by_type() — see
// supabase/migrations/20260928130000_player_stats_attendance_by_type_rpc.sql.
// One row per convocation type with at least one validated attendance_records
// row for the caller this season — never a 0/0 row (AC-PS-26/27).
export interface AttendanceSummaryByTypeDto {
  convocation_type: string
  validated_count: number
  present_count: number
}
