import { DomainError } from './domain-error'

// specs/web-create-convocation.md §3 — structurally valid input that breaks a
// business rule of UpdateConvocationUseCase / RecordAttendanceByAdminUseCase:
// a new date in the past, an empty title or location, an opponent that does
// not belong to the team, a type change, a player outside the team roster.
export class InvalidConvocationInputError extends DomainError {}
