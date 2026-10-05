import type { ProfileDues } from '@domain/usecases/profile/GetProfileMembershipUseCase'
import type { MembershipPaymentStatus } from '@domain/rules/membership-payment-rules'
import { formatEuros } from '@presentation/shared/formatters/currency'
import { formatLongDate } from '@presentation/shared/formatters/long-date'
import { formatPaymentMethod } from '@presentation/shared/formatters/payment-method-labels'
import { PAYMENT_STATUS_LABELS } from '@presentation/shared/formatters/payment-status-labels'

// specs/profile-membership-dues.md §3/§4 — what the "Cotisation" row renders.
// Pure display mapping of the domain's ProfileDues: amounts, status and the
// link flag were already computed by the use case (AC-PMD-05), nothing is
// recomputed or compared here.
export interface ProfileDuesView {
  // 'undefined' (no amount due, PO-PMD-04) renders no status badge and no link.
  status: MembershipPaymentStatus
  statusLabel: string
  // "{paid} / {due}", or the paid amount alone when no amount due is known.
  amountsLabel: string
  // Neutral mention shown instead of a badge when the amount due is unknown.
  undefinedMention: string | null
  // Screen-reader label of the toggle: status carried by text, never colour.
  toggleAriaLabel: string
  // Nothing to unfold: undefined amount AND no payment (UI design §4).
  isExpandable: boolean
  // Already newest first (domain/repository order); methodLabel null = nothing rendered.
  payments: { id: string; amountLabel: string; dateLabel: string; methodLabel: string | null }[]
  showPaymentLink: boolean
  paymentUrl: string | null
}

function spokenEuros(cents: number): string {
  return `${Math.round(cents / 100)} euros`
}

export function toProfileDuesView(dues: ProfileDues): ProfileDuesView {
  const isUndefined = dues.status === 'undefined'
  const statusLabel = PAYMENT_STATUS_LABELS[dues.status]
  const paidLabel = formatEuros(dues.paidCents)

  return {
    status: dues.status,
    statusLabel,
    amountsLabel: dues.amountDueCents === null ? paidLabel : `${paidLabel} / ${formatEuros(dues.amountDueCents)}`,
    undefinedMention: isUndefined ? 'Montant non fixé' : null,
    toggleAriaLabel: isUndefined
      ? `Cotisation, ${spokenEuros(dues.paidCents)} versés, montant non fixé`
      : `Cotisation, ${spokenEuros(dues.paidCents)} sur ${spokenEuros(dues.amountDueCents ?? 0)}, ${statusLabel}`,
    isExpandable: !isUndefined || dues.payments.length > 0,
    payments: dues.payments.map((payment) => ({
      id: payment.id,
      amountLabel: formatEuros(payment.amountCents),
      // Local Y/M/D components, never new Date('yyyy-mm-dd') (UTC-4 shift, AC-PMD-10).
      dateLabel: formatLongDate(payment.paidAt),
      methodLabel: payment.paymentMethod ? formatPaymentMethod(payment.paymentMethod) : null,
    })),
    showPaymentLink: dues.showPaymentLink,
    paymentUrl: dues.paymentUrl,
  }
}
