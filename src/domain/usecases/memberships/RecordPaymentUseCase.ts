import type { Payment } from '../../entities/payment'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidPaymentInputError } from '../../errors/invalid-payment-input-error'
import { can } from '../../policies/can'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type { PaymentRepository } from '../../repositories/payment-repository'
import type { UserRepository } from '../../repositories/user-repository'

export interface RecordPaymentUseCaseInput {
  actorId: string
  membershipId: string
  amountCents: number
  paidAt: string // ISO date (yyyy-mm-dd) — date the payment was RECEIVED, §2.2.
}

// specs/web-memberships.md §2.2/§4/AC-WM-16 — "l'enregistrement d'un paiement
// déjà reçu hors application" (§1): this use case never talks to a payment
// provider, never encaisse anything, only CONSTATE. Always an INSERT
// (PaymentRepository.create()), never an update/upsert (§2.2, CLAUDE.md §6
// exception documented in the migration).
//
// §4 — the CDC §11.3 explicitly names "modification paiement" as an action
// to trace, and CLAUDE.md §6 says a business action with intent is logged
// FROM THE USE CASE, never a component or a trigger. Follow-up pass to
// specs/web-audit-logs.md (2026-09-30 fourth addendum): the audit
// infrastructure PO-WM-09 was blocked on now exists
// (public.record_audit_log_entry, domain/repositories/audit-log-repository.ts's
// `record()`) and this use case emits 'membership.payment_recorded' below,
// after the payment itself has already committed.
//
// Audit-write failure AFTER the payment write has already succeeded — same
// tradeoff, and same reasoning, as AssignRoleUseCase's own top comment: no
// shared transaction across the two calls (client-RLS-gated INSERT on
// membership_payments vs. a SECURITY DEFINER RPC on audit_log), so the
// payment cannot be rolled back if the audit call fails. Caught and
// surfaced via `console.error`, never rejecting this use case's own
// promise — the business outcome (the payment is recorded) already
// succeeded, the caller/UI should see success.
export class RecordPaymentUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: RecordPaymentUseCaseInput): Promise<Payment> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }

    if (!can(user, 'payment:record')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to record payments`)
    }

    // AC-WM-16 — rejected from the domain, before any network call.
    // amount_cents strictly positive per §2.2 ("un remboursement ou un
    // avoir n'est pas spécifié ici", PO-WM-04) — mirrored by the
    // membership_payments amount_cents CHECK constraint.
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
      throw new InvalidPaymentInputError('amountCents must be a strictly positive integer number of cents')
    }
    if (!input.paidAt) {
      throw new InvalidPaymentInputError('paidAt is required')
    }

    const payment = await this.paymentRepository.create({
      membershipId: input.membershipId,
      amountCents: input.amountCents,
      paidAt: input.paidAt,
      recordedBy: user.id,
    })

    // See this class's own top comment for why a rejection here does not
    // reject execute()'s own promise.
    try {
      await this.auditLogRepository.record({
        action: 'membership.payment_recorded',
        targetId: input.membershipId,
        targetType: 'membership',
        // Not sensitive — an amount and a date, needed archival detail per
        // public.audit_log.metadata's own column comment.
        metadata: { amountCents: input.amountCents, paidAt: input.paidAt },
      })
    } catch (auditError) {
      console.error('RecordPaymentUseCase: failed to record membership.payment_recorded audit entry', {
        actorId: input.actorId,
        targetId: input.membershipId,
        auditError,
      })
    }

    return payment
  }
}
