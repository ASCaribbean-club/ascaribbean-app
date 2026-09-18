import { DomainError } from './domain-error'

// specs/web-memberships.md §2.7/PO-WM-03 — GENUINELY BLOCKING, not resolved
// by this pass (task instruction: do not guess at financial data handling).
// Thrown by CreateMembershipUseCase when an admin tries to create a
// membership for a (user, season) pair that already has an ARCHIVED
// membership carrying at least one recorded payment. Both readings of
// "remplacer" (R1: desarchive and overwrite in place, payments stay
// attached; R2: insert a new row, payments stay on the dead archived row)
// have different, real financial consequences, and neither is chosen here —
// see CreateMembershipUseCase's own comment on this branch. The
// NO-payments-attached case IS implemented (the archived row is desarchived
// and overwritten in place, the only reading that has zero financial
// ambiguity), so this error only ever fires once a membership genuinely has
// payment history — the exact case this spec asked to leave unimplemented
// rather than guessed.
export class ArchivedMembershipHasPaymentsError extends DomainError {}
