import { DomainError } from './domain-error'

// specs/web-memberships.md §2.2/AC-WM-16 — thrown by RecordPaymentUseCase
// when amountCents is missing/zero/negative/non-integer, or paidAt is
// missing.
export class InvalidPaymentInputError extends DomainError {}
