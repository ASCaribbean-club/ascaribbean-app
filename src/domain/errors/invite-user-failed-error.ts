import { DomainError } from './domain-error'

// specs/web-users.md §2.5 — generic fallback for any invite-user Edge
// Function failure that isn't one of the two specifically-named cases
// (UserAlreadyRegisteredError, UserDirectoryInsertFailedError): a network
// error, an unparsable response, or a 5xx the function itself didn't
// anticipate. Deliberately NOT given its own branch in
// mapDomainErrorToUiError — it falls through to that file's generic
// `instanceof DomainError` copy ("Une erreur est survenue..."), the same
// reasonable fallback every other unclassified DomainError already gets.
export class InviteUserFailedError extends DomainError {}
