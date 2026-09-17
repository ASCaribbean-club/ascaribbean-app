import { DomainError } from './domain-error'

// specs/section-and-teams.md §2.10/AC-ST-40 — thrown by
// AssignCoachToTeamsUseCase, from the domain and before any network call,
// when userId is missing or teamIds is empty (submitting the dialog with no
// team checked). Same minimal pattern as InvalidTeamInputError, the class
// carries no logic of its own.
export class InvalidCoachAssignmentInputError extends DomainError {}
