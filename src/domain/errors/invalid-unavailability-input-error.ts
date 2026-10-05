import { DomainError } from './domain-error'

// Thrown by the unavailability write use cases, from the domain and before any
// network call: malformed date, negative / non-integer match count, or an edit
// that changes the kind of an existing unavailability. Deliberately NOT thrown
// for end <= start: that range rule is still OPEN (PO-PU-08).
export class InvalidUnavailabilityInputError extends DomainError {}
