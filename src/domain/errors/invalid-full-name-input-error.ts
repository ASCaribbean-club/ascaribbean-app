import { DomainError } from './domain-error'

// specs/web-users.md §2.7/AC-WU-38 — thrown by UpdateUserFullNameUseCase,
// from the domain and before any network call, when fullName is blank.
// Deliberately a SEPARATE class from InvalidUserInputError (invite: both
// fullName AND email required) — the two dialogs reject on different
// missing fields and want different French copy in
// mapDomainErrorToUiError.
export class InvalidFullNameInputError extends DomainError {}
