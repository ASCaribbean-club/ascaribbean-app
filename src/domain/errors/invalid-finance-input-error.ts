import { DomainError } from './domain-error'

// specs/mob-treasurer-finances.md AC-FI-10/AC-FI-13/AC-FI-28 — thrown by the
// finance use cases when an amount, label, date, category, carrier, method or
// count is invalid. Rejected from domain/, before any network call.
export class InvalidFinanceInputError extends DomainError {}
