import { DomainError } from './domain-error'

// specs/match-stats.md MS-05/AC-MS-05 — thrown by AddMatchEventUseCase when
// adding one more 'goal' event would push the recorded goal-event count
// past goals_for, and by RecordMatchScoreUseCase when a REVISED goalsFor
// would fall below the goal-event count already on record. Same class,
// same message, for both directions of the one rule
// (isScorerCountConsistent, domain/policies/match-outcome-rules.ts) — also
// the backstop for the match_details_goals_both_or_none_check /
// match_events_penalty_requires_goal_check Postgres constraints, see
// data/errors/map-supabase-error.ts.
export class InconsistentMatchScoreError extends DomainError {}
