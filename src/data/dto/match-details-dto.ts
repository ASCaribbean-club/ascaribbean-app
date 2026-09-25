// Raw shape of public.match_details — 1:1 satellite of convocations, PK = FK
// (specs/create-convocation.md §2, mid-pass correction — see
// domain/entities/match-details.ts). Migration not written as part of this
// scaffold; see that entity's comment for the SQL shape.
export interface MatchDetailsRow {
  convocation_id: string
  opponent_id: string
  is_home: boolean
  // Nullable since migration 20260925142528_match_details_meeting_point_optional.sql
  meeting_point_time: string | null
  meeting_point_location: string | null
  // specs/match-stats.md MS-01 — added by
  // supabase/migrations/20260924100000_match_statistics_schema.sql. Both
  // null together (no score recorded yet) or both set — never one without
  // the other (match_details_goals_both_or_none_check).
  goals_for: number | null
  goals_against: number | null
}

// specs/edit-match-details.md §5/§6 — the exact 3 columns
// `grant update (is_home, meeting_point_time, meeting_point_location)`
// restricts a client to (see the migration this comment names). A separate
// DTO, not a `Partial<MatchDetailsRow>`: `Partial<>` would still TYPE-ALLOW
// `opponent_id` to be passed, only an object literal omitting it happens to
// avoid sending it — this type makes including it a compile error, same
// reasoning as MatchArrangements itself (domain/entities/match-details.ts).
export type MatchArrangementsUpdateRow = Pick<MatchDetailsRow, 'is_home' | 'meeting_point_time' | 'meeting_point_location'>
