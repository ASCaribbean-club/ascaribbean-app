import { DomainError } from './domain-error'

// specs/match-stats.md MS-12/AC-MS-13 — thrown by RecordMatchScoreUseCase/
// AddMatchEventUseCase when isMatchResultRecordable(convocation.date, now)
// is false. Domain-level, before any write — the database has no matching
// guard (accepted risk, same reasoning as the player response-deadline
// window, MS-12's own comment).
export class MatchNotStartedError extends DomainError {}
