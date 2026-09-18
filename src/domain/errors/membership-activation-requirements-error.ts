import { DomainError } from './domain-error'

// specs/web-memberships.md §2.4/AC-WM-35 — règle d'activation (amendement du
// 2026-09-17, posée par la développeuse, dérivable d'aucune maquette).
// Thrown by CreateMembershipUseCase/UpdateMembershipUseCase, from the domain
// and before any network call, when a status of 'active' is requested for a
// membership that does not (yet) satisfy BOTH conditions of
// canSetMembershipActive (a non-blank licenceNumber AND a fully-settled
// cotisation) — see that predicate's own doc comment in
// domain/rules/membership-payment-rules.ts. Never thrown for 'pending' or
// 'suspended' (§2.4 — the rule constrains ONLY the transition to 'active').
export class MembershipActivationRequirementsNotMetError extends DomainError {}
