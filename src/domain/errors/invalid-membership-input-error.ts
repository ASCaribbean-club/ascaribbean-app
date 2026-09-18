import { DomainError } from './domain-error'

// specs/web-memberships.md §2.1/AC-WM-15 — thrown by CreateMembershipUseCase/
// UpdateMembershipUseCase, from the domain and before any network call, when
// userId/seasonId/status/validUntil is missing. licenceNumber empty/null is
// explicitly NOT one of these cases (§2.1, mockup row 1's empty cell is a
// valid, normal state).
export class InvalidMembershipInputError extends DomainError {}
