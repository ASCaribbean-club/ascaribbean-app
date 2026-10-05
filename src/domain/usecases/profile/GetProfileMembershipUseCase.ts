import type { Membership } from '../../entities/membership'
import type { Payment } from '../../entities/payment'
import type { MembershipRepository } from '../../repositories/membership-repository'
import type { PaymentRepository } from '../../repositories/payment-repository'
import type { SeasonRepository } from '../../repositories/season-repository'
import { shouldShowDuesPaymentLink } from '../../rules/dues-payment-link-rules'
import {
  effectiveAmountDueCents,
  membershipPaymentStatus,
  sumPaymentsCents,
  type MembershipPaymentStatus,
} from '../../rules/membership-payment-rules'

export interface GetProfileMembershipInput {
  userId: string
}

// specs/profile-membership-dues.md §2.3/§2.4 — the member's OWN cotisation for
// the displayed (current-season) membership. Every figure comes from the
// existing rules, never a second formula (AC-PMD-05).
export interface ProfileDues {
  // Effective amount due (membership's own, else the season tariff), in
  // cents; null when neither exists (status 'undefined').
  amountDueCents: number | null
  paidCents: number
  status: MembershipPaymentStatus
  // Newest first (PaymentRepository.listForMembership's ordering contract).
  payments: Payment[]
  // The season's external payment page; null when none is set.
  paymentUrl: string | null
  // shouldShowDuesPaymentLink(status, paymentUrl), AC-PMD-11.
  showPaymentLink: boolean
}

// specs/profile-page.md, 2026-09-04 addendum — resolves PO-PR-06.
// `seasonLabel` travels alongside `membership` rather than being a separate
// ViewModel field: a membership only means something in relation to which
// season it covers ("adhésion 2026-2027"), so the two are resolved and
// exposed together instead of forcing the Page to reconcile two
// independently-loading queries by hand. `dues` (specs/profile-membership-
// dues.md) joins them for the same reason: it needs the season (tariff, link)
// and the membership (own amount due, payments) this use case already
// resolves, and is null whenever there is no membership to owe anything on.
export interface ProfileMembership {
  membership: Membership | null
  seasonLabel: string | null
  dues: ProfileDues | null
}

export class GetProfileMembershipUseCase {
  constructor(
    private readonly membershipRepository: MembershipRepository,
    private readonly seasonRepository: SeasonRepository,
    private readonly paymentRepository: PaymentRepository,
  ) { }

  async execute(input: GetProfileMembershipInput): Promise<ProfileMembership> {
    const season = await this.seasonRepository.findCurrent()

    // Gap between two seasons (e.g. summer break) — valid state, not an
    // error, same treatment as SeasonRepository.findCurrent's own contract
    // and TeamRepositoryImpl's handling of the same case.
    if (!season) return { membership: null, seasonLabel: null, dues: null }

    const membership = await this.membershipRepository.findForUserAndSeason(input.userId, season.id)
    if (!membership) return { membership: null, seasonLabel: season.label, dues: null }

    // membership_payments_select_own_or_admin (RLS): a member reads only the
    // payments of their own membership — no new policy (AC-PMD-02).
    const payments = await this.paymentRepository.listForMembership(membership.id)
    const amountDueCents = effectiveAmountDueCents(membership.amountDueCents, season.cotisationAmount)
    const paidCents = sumPaymentsCents(payments)
    const status = membershipPaymentStatus(paidCents, amountDueCents)

    return {
      membership,
      seasonLabel: season.label,
      dues: {
        amountDueCents,
        paidCents,
        status,
        payments,
        paymentUrl: season.paymentUrl,
        showPaymentLink: shouldShowDuesPaymentLink(status, season.paymentUrl),
      },
    }
  }
}
