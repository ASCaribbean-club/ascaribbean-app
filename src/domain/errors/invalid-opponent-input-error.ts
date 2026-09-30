import { DomainError } from './domain-error'

// specs/team-opponents.md §2.2/AC-TO-08 — thrown by AddOpponentToTeamUseCase,
// from the domain and before any network call, when the opponent name is
// empty/whitespace-only or no club team was chosen.
export class InvalidOpponentInputError extends DomainError {}
