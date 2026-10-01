import { DomainError } from './domain-error'

// specs/coach-match-composition.md AC-MC-07 — thrown by SaveMatchLineupUseCase,
// before any network call, when a lineup breaks one of the invariants the
// database also enforces (one slot per player, one player per slot, placed
// players belong to the convoked roster) or names an unknown formation.
export class InvalidMatchLineupInputError extends DomainError {}
