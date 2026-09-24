import { DomainError } from './domain-error'

// specs/match-stats.md MS-14/AC-MS-15 — thrown by AddMatchEventUseCase when
// a 'goal' event is submitted for a match with no score recorded yet
// (match_details.goalsFor/goalsAgainst both null). Never thrown for
// 'penalty_missed'/'yellow_card'/'red_card' — MS-17 explicitly skips this
// check for penalty_missed, and the other two event types never touch the
// score at all.
export class MatchScoreMissingError extends DomainError {}
