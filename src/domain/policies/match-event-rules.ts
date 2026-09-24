import type { MatchEventType } from '../entities/match-event'

// specs/match-stats.md MS-16/AC-MS-16 — is_penalty is only ever meaningful
// on a 'goal' event (a converted penalty = one 'goal' row with
// isPenalty = true). A missed penalty is its own eventType
// ('penalty_missed'), never this flag set on a card or on 'penalty_missed'
// itself. ⚠️ DUPLICATED in SQL — see the
// match_events_penalty_requires_goal_check constraint in
// supabase/migrations/20260924100000_match_statistics_schema.sql. That
// constraint is authoritative in production; this function exists so the
// rule is readable/testable in domain/ and so AddMatchEventUseCase can
// reject early with a domain error instead of surfacing a raw Postgres
// check-violation. Any change to this rule must be mirrored in both places.
export function isValidPenaltyFlag(eventType: MatchEventType, isPenalty: boolean): boolean {
  return !isPenalty || eventType === 'goal'
}
