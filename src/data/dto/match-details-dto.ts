// Raw shape of public.match_details — 1:1 satellite of convocations, PK = FK
// (specs/create-convocation.md §2, mid-pass correction — see
// domain/entities/match-details.ts). Migration not written as part of this
// scaffold; see that entity's comment for the SQL shape.
export interface MatchDetailsRow {
  convocation_id: string
  opponent_id: string
  is_home: boolean
  meeting_point_time: string
  meeting_point_location: string
  // specs/match-stats.md MS-01 — added by
  // supabase/migrations/20260924100000_match_statistics_schema.sql. Both
  // null together (no score recorded yet) or both set — never one without
  // the other (match_details_goals_both_or_none_check).
  goals_for: number | null
  goals_against: number | null
}