import { DomainError } from './domain-error'

// specs/web-users.md §2.5/AC-WU-33 — thrown by InviteUserUseCase, from the
// domain and before any network call, when fullName or email is missing.
export class InvalidUserInputError extends DomainError {}
