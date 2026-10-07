import { DomainError } from './domain-error'

// specs/web-finance-carriers.md AC-FC-06 — label empty or too long, detail too
// long, kind outside bank | cash. Rejected from domain/, before any network
// call (the database CHECK constraints are the backstop).
export class InvalidFinanceCarrierInputError extends DomainError {}
