import type { MembershipPaymentStatus } from '@domain/rules/membership-payment-rules'

// Text label of each payment status — never colour alone (AC-TR-19). Shared by
// the Treasurer's dues list and the member's own profile row
// (specs/profile-membership-dues.md AC-PMD-05: same wording on both screens).
export const PAYMENT_STATUS_LABELS: Record<MembershipPaymentStatus, string> = {
  paid: 'Soldée',
  partial: 'Partielle',
  unpaid: 'Impayée',
  undefined: 'Montant non défini',
}
