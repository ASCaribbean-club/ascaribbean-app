import type { Membership, MembershipStatus } from '../../entities/membership'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidMembershipInputError } from '../../errors/invalid-membership-input-error'
import { MembershipActivationRequirementsNotMetError } from '../../errors/membership-activation-requirements-error'
import { can } from '../../policies/can'
import { canSetMembershipActive, sumPaymentsCents } from '../../rules/membership-payment-rules'
import type { MembershipRepository } from '../../repositories/membership-repository'
import type { PaymentRepository } from '../../repositories/payment-repository'
import type { UserRepository } from '../../repositories/user-repository'

export interface UpdateMembershipUseCaseInput {
  actorId: string
  membershipId: string
  userId: string
  seasonId: string
  licenceNumber: string | null
  status: MembershipStatus
  validUntil: string
  // specs/web-memberships.md §2.1/AC-WM-34 (amendement du 2026-09-17) — the
  // edit row's own "Cotisation totale (€)" field, in integer cents (already
  // converted from euros by the ViewModel, never a float reaching here).
  // Nullable: the field can be cleared back to "no amount due configured".
  amountDueCents: number | null
}

// specs/web-memberships.md §2.4/AC-WM-26 — same shape as CreateMembershipUseCase,
// targeting the SAME row (never a duplicate insert). No "which rows are
// modifiable" restriction (§2.9) — unlike seasons_update_admin, no document
// requires locking a membership's editability by any state.
export class UpdateMembershipUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly membershipRepository: MembershipRepository,
    private readonly paymentRepository: PaymentRepository,
  ) {}

  async execute(input: UpdateMembershipUseCaseInput): Promise<Membership> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }

    if (!can(user, 'membership:write')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to write memberships`)
    }

    if (!input.userId) {
      throw new InvalidMembershipInputError('userId is required')
    }
    if (!input.seasonId) {
      throw new InvalidMembershipInputError('seasonId is required')
    }
    if (!input.status) {
      throw new InvalidMembershipInputError('status is required')
    }
    if (!input.validUntil) {
      throw new InvalidMembershipInputError('validUntil is required')
    }
    // §2.1/AC-WM-34 — mirrors the database's own `amount_due_cents >= 0`
    // check constraint, rejected from the domain first rather than left to
    // surface as a raw Postgres error.
    if (input.amountDueCents !== null && (!Number.isInteger(input.amountDueCents) || input.amountDueCents < 0)) {
      throw new InvalidMembershipInputError('amountDueCents must be a non-negative integer number of cents, or null')
    }

    // specs/web-memberships.md §2.4/AC-WM-35 (amendement du 2026-09-17) —
    // rejected from the domain, before the write. Unlike CreateMembershipUseCase,
    // an EXISTING membership can genuinely carry payments already recorded
    // through "+ Paiement" (a separate flow, §1) — so the real sum is read
    // here, never assumed to be 0.
    if (input.status === 'active') {
      const payments = await this.paymentRepository.listForMembership(input.membershipId)
      const paidCents = sumPaymentsCents(payments)
      if (!canSetMembershipActive(input.licenceNumber, paidCents, input.amountDueCents)) {
        throw new MembershipActivationRequirementsNotMetError(
          `Membership ${input.membershipId} cannot be set to "active": it requires a non-blank licence number and a fully-settled cotisation (§2.4/AC-WM-35).`,
        )
      }
    }

    return this.membershipRepository.update(input.membershipId, {
      userId: input.userId,
      seasonId: input.seasonId,
      licenceNumber: input.licenceNumber,
      status: input.status,
      validUntil: input.validUntil,
      amountDueCents: input.amountDueCents,
    })
  }
}
