import type { Membership, MembershipStatus } from '../../entities/membership'
import { ArchivedMembershipHasPaymentsError } from '../../errors/archived-membership-has-payments-error'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidMembershipInputError } from '../../errors/invalid-membership-input-error'
import { MembershipActivationRequirementsNotMetError } from '../../errors/membership-activation-requirements-error'
import { can } from '../../policies/can'
import { canSetMembershipActive } from '../../rules/membership-payment-rules'
import type { MembershipRepository } from '../../repositories/membership-repository'
import type { PaymentRepository } from '../../repositories/payment-repository'
import type { UserRepository } from '../../repositories/user-repository'

export interface CreateMembershipUseCaseInput {
  actorId: string
  userId: string
  seasonId: string
  licenceNumber: string | null
  status: MembershipStatus
  validUntil: string // ISO date (yyyy-mm-dd, native <input type="date"> value)
}

// specs/web-memberships.md §2.4/§3 — same authorization-before-validation
// ordering as CreateSeasonUseCase/CreateClubNewsUseCase: an unauthorized
// caller never learns which field would have been rejected. Club-wide
// action, no team/section scope (§3, 'admin' carries no scope field in
// RoleAssignment) — no context object needed here.
export class CreateMembershipUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly membershipRepository: MembershipRepository,
    private readonly paymentRepository: PaymentRepository,
  ) {}

  async execute(input: CreateMembershipUseCaseInput): Promise<Membership> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }

    if (!can(user, 'membership:write')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to write memberships`)
    }

    // AC-WM-15 — rejected from the domain, before any network call.
    // licenceNumber empty/null is a VALID case (§2.1, mockup row 1) and is
    // deliberately not checked here.
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

    // specs/web-memberships.md §2.4/AC-WM-35 (amendement du 2026-09-17) —
    // rejected from the domain, before any repository call. A membership
    // created through THIS use case always has amountDueCents === null
    // (the "Nouvelle adhésion" dialog never carries that field, §2.1) and
    // zero payments recorded (it doesn't exist yet — even the
    // recreate-after-archive branch below only fires when the archived row
    // has NO payments attached). canSetMembershipActive(licence, 0, null)
    // is therefore mathematically unsatisfiable today: a brand-new
    // membership can never be created directly as 'active', only as
    // 'pending'/'suspended' and later promoted via UpdateMembershipUseCase
    // once a licence and a fully-settled cotisation exist. This is the
    // literal, honest consequence of AC-WM-35's two conditions — not a
    // guess at PO-WM-02 ("peut-on activer sans montant dû ?", still open).
    if (input.status === 'active' && !canSetMembershipActive(input.licenceNumber, 0, null)) {
      throw new MembershipActivationRequirementsNotMetError(
        'A membership cannot be created directly with status "active": it requires a non-blank licence number and a fully-settled cotisation, neither of which a brand-new membership can carry yet.',
      )
    }

    const createInput = {
      userId: input.userId,
      seasonId: input.seasonId,
      licenceNumber: input.licenceNumber,
      status: input.status,
      validUntil: input.validUntil,
      // §2.1/AC-WM-34 — always null on creation: the "Nouvelle adhésion"
      // dialog does not carry a "Cotisation totale (€)" field. Only
      // UpdateMembershipUseCase (the edit row) ever writes a real value.
      amountDueCents: null,
    }

    // specs/web-memberships.md §2.7/PO-WM-03 — "Recréation (même membre,
    // même saison, après archivage)". Renewal (same member, a DIFFERENT
    // season) never reaches this branch at all — it always goes straight to
    // membershipRepository.create() below, a brand-new row, exactly as the
    // mockup's own italic copy and the "un renouvellement crée toujours une
    // nouvelle ligne" heading demand. This branch ONLY fires for the exact
    // same (userId, seasonId) pair as an existing ARCHIVED row.
    const archived = await this.membershipRepository.findArchivedForUserAndSeason(input.userId, input.seasonId)
    if (archived) {
      const existingPayments = await this.paymentRepository.listForMembership(archived.id)

      if (existingPayments.length > 0) {
        // PO-WM-03 — genuinely blocking, NOT resolved here (task
        // instruction: never guess at financial data handling). See
        // ArchivedMembershipHasPaymentsError's own doc comment for the two
        // unresolved readings (R1/R2) of "remplacer".
        throw new ArchivedMembershipHasPaymentsError(
          `An archived membership (${archived.id}) already exists for user ${input.userId} / season ${input.seasonId} with ${existingPayments.length} payment(s) recorded — PO-WM-03 is unresolved for this case (specs/web-memberships.md §2.7).`,
        )
      }

      // No payments attached — financially inert, so the simplest safe
      // reading of "remplacer" applies (R1): desarchive the existing row
      // and overwrite it in place with the new values. Single row, same id,
      // never a second insert left dangling.
      return this.membershipRepository.replaceArchived(archived.id, createInput)
    }

    // No archived collision — including the normal renewal case (different
    // season) and the very first membership ever created for this pair.
    // DuplicateMembershipError (a LIVE row already existing) is left to
    // surface from the database's own partial unique index, never
    // pre-checked here (TOCTOU, same reasoning as CreateSeasonUseCase's own
    // comment on not pre-checking season overlap).
    return this.membershipRepository.create(createInput)
  }
}
