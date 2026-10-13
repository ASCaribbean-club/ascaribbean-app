// Raw shape of public.convocation_attendees — current-state list, one row per
// (convocation, player), no free-text column, no health data
// (specs/convocation-player-selection.md §2, AC-CPS-18). Migration:
// supabase/migrations/20261012181248_convocation_attendees_schema.sql.
export interface ConvocationAttendeeRow {
  convocation_id: string
  user_id: string
}
