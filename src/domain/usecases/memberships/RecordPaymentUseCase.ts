import type { Payment } from '../../entities/payment'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidPaymentInputError } from '../../errors/invalid-payment-input-error'
import { can } from '../../policies/can'
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
// FROM THE USE CASE, never a component or a trigger. No call is wired here:
// PO-WM-09 is open (no audit infrastructure exists anywhere in this repo
// yet) — this comment marks exactly where that call belongs once it is.
export class RecordPaymentUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly paymentRepository: PaymentRepository,
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

    return this.paymentRepository.create({
      membershipId: input.membershipId,
      amountCents: input.amountCents,
      paidAt: input.paidAt,
      recordedBy: user.id,
    })
  }
}
