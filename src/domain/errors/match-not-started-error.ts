import { DomainError } from './domain-error'

// specs/match-stats.md MS-12/AC-MS-13 — thrown by RecordMatchScoreUseCase/
// AddMatchEventUseCase when isMatchResultRecordable(convocation.date, now)
// is false. Domain-level, before any write, so the UI fails fast without a
// round trip — RLS (match_details_update_record_score, patched by
// 20260925150603_edit_match_details_write_policy.sql's merge-fix section)
// enforces the same `c.date < now()` condition server-side, same
// defense-in-depth shape as match_details_update_arrangements/
// convocations_update_arrangements.
export class MatchNotStartedError extends DomainError {}
