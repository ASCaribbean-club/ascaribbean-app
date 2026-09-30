import { DomainError } from './domain-error'

// Thrown by InviteUserUseCase and UpdateUserUseCase, from the domain and
// before any network call, when the admin-entered age is not an integer
// between 1 and 120.
export class InvalidUserProfileInputError extends DomainError {}
