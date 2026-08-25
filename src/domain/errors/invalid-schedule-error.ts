import { DomainError } from './domain-error'

// specs/create-convocation.md §5, résolution PO-CV-09 — thrown by
// CreateConvocationUseCase when isValidMatchSchedule() rejects the
// RDV/kickoff pair for a match convocation. Same minimal pattern as
// InvalidRoleScopeError — the class carries no logic of its own.
export class InvalidScheduleError extends DomainError {}