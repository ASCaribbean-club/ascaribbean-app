// specs/match-stats.md MS-03/MS-04 — one row per individual match event,
// a separate append-only log, never merged into MatchDetails or Convocation
// (same "satellite table, not a field on the parent" reasoning already
// applied to MatchDetails/MeetingDetails themselves). MS-15 — names are
// deliberately footballistic; no multi-sport abstraction.
export type MatchEventType = 'goal' | 'penalty_missed' | 'yellow_card' | 'red_card'

export interface MatchEvent {
  id: string
  convocationId: string // references match_details(convocation_id), NOT convocations(id) — AC-MS-18
  userId: string // the scorer/carded player
  eventType: MatchEventType
  // MS-16 — only ever true when eventType === 'goal' (mirrored by
  // domain/policies/match-event-rules.ts's isValidPenaltyFlag and by
  // match_events_penalty_requires_goal_check in
  // supabase/migrations/20260924100000_match_statistics_schema.sql). A
  // missed penalty is its own eventType ('penalty_missed'), never this flag
  // set on a non-goal row.
  isPenalty: boolean
  createdBy: string // the coach/staff who recorded it
  createdAt: string // ISO
}
