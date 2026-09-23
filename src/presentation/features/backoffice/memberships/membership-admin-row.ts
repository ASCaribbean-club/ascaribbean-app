import type { Membership } from '@domain/entities/membership'
import type { Season } from '@domain/entities/season'
import type { UserSummary } from '@domain/repositories/user-repository'
import { membershipPaymentStatus, sumPaymentsCents, type MembershipPaymentStatus } from '@domain/rules/membership-payment-rules'
import { eurosToCents } from '@presentation/shared/formatters/currency'
import type { Payment } from '@domain/entities/payment'

export interface MembershipAdminRow {
  membership: Membership
  userFullName: string
  seasonLabel: string
  // specs/web-seasons.md §2.7/AC-WS-33 (amendement du 2026-09-17 (2)) — the
  // season's own reference tarif, in euros, read here for
  // useMembershipEditRowViewModel to pre-fill "Cotisation totale (€)" when
  // this membership doesn't carry its own amountDueCents yet (a developer
  // decision: a per-membership default, not a spec'd requirement of either
  // web-seasons or web-memberships). Never written back to the season from
  // this screen — a pure read.
  seasonCotisationAmount: number | null
  // Developer decision (not spec'd) — the amount actually used for the
  // COTISATION column/filter and RecordPaymentDialog's context line: the
  // membership's own amountDueCents when it has one, else the season's
  // cotisationAmount converted to cents. Deliberately NOT reused by the
  // activation rule (AC-WM-35, canSetMembershipActive in
  // CreateMembershipUseCase/UpdateMembershipUseCase) — that domain rule
  // still checks only the STORED amountDueCents, so a row can display a
  // green "payé" bar off the season default while still being refused
  // 'active' until an admin actually saves an amount on the membership
  // itself. PO-WM-02/PO-WM-08 (should a season-derived default count for
  // activation too?) are left open, not decided here.
  effectiveAmountDueCents: number | null
  // AC-WM-12/AC-WM-13 — the REAL sum of this membership's payments
  // (amendement du 2026-09-17, PO-WM-01 resolved), computed ONCE here from
  // paymentRepository.findAllForAdmin()'s bulk read grouped by membership id
  // — never a per-row network call (see paidCentsByMembership below).
  paidCents: number
  // AC-WM-12/AC-WM-13 — computed from effectiveAmountDueCents above (the
  // SAME predicate the "cotisation" filter also calls, never a second
  // calculation) — NOT the same input the activation rule uses, see that
  // field's own comment.
  paymentStatus: MembershipPaymentStatus
}

// specs/web-dashboard.md §2.4a/AC-WD-12 — EXTRACTED from
// useBackofficeMembershipsViewModel's own inline `.map(...)` (2026-09-17
// era) so /admin/overview's UnpaidDuesPanel can build the EXACT same
// MembershipAdminRow shape without recopying the assembly rule
// (effectiveAmountDueCents' own fallback, the payment sum, the status
// predicate). Both screens now import THIS function — a change to the
// "what counts as the amount due" decision only ever needs to happen here.
// Pure data composition, no repository/query dependency of its own (same
// "domain rule stays in domain/rules/, this is presentation-only assembly"
// split as before the extraction).
export function assembleMembershipAdminRows(
  memberships: Membership[],
  users: UserSummary[],
  seasons: Season[],
  payments: Payment[],
): MembershipAdminRow[] {
  const usersById = new Map(users.map((candidate) => [candidate.id, candidate]))
  const seasonsById = new Map(seasons.map((season) => [season.id, season]))

  const paymentsByMembership = new Map<string, Payment[]>()
  for (const payment of payments) {
    const bucket = paymentsByMembership.get(payment.membershipId)
    if (bucket) bucket.push(payment)
    else paymentsByMembership.set(payment.membershipId, [payment])
  }

  return memberships.map((membership) => {
    const paidCents = sumPaymentsCents(paymentsByMembership.get(membership.id) ?? [])
    const seasonCotisationAmount = seasonsById.get(membership.seasonId)?.cotisationAmount ?? null
    // See MembershipAdminRow.effectiveAmountDueCents' own comment — display
    // only, the activation rule never sees this fallback.
    const effectiveAmountDueCents = membership.amountDueCents ?? (seasonCotisationAmount !== null ? eurosToCents(seasonCotisationAmount) : null)
    return {
      membership,
      userFullName: usersById.get(membership.userId)?.fullName ?? '',
      seasonLabel: seasonsById.get(membership.seasonId)?.label ?? '',
      seasonCotisationAmount,
      effectiveAmountDueCents,
      paidCents,
      paymentStatus: membershipPaymentStatus(paidCents, effectiveAmountDueCents),
    }
  })
}
