import type { Payment } from '@domain/entities/payment'
import { formatEuros } from '@presentation/shared/formatters/currency'

interface PaymentHistoryListProps {
  isLoading: boolean
  payments: Payment[]
}

// specs/web-memberships.md UI design, "HISTORIQUE DES VERSEMENTS" /
// "RecordPaymentDialog" (amendement du 2026-09-17) — the ONE shared history
// list component, consumed by BOTH RecordPaymentDialog (its own dialog,
// opened from a COLLAPSED row's "+ Paiement") and MembershipEditRow's right
// column (opened by dépliage, never re-fetching separately — both read the
// SAME queryKeys.membershipPayments(membershipId)). Plain reverse-
// chronological list (repository's own ordering, never re-sorted here) —
// no modify/delete control on any row (§2.2, append-only, AC-WM-06).
export function PaymentHistoryList({ isLoading, payments }: PaymentHistoryListProps) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>
  }

  // UI design — exact copy repeated verbatim at both points of use so an
  // admin sees the identical wording whether they opened this from
  // "+ Paiement" or from the dépliée row.
  if (payments.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun versement enregistré.</p>
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {payments.map((payment) => (
        <li key={payment.id} className="flex items-center justify-between px-3 py-2 text-sm">
          <span className="text-muted-foreground">{payment.paidAt}</span>
          <span className="font-medium">{formatEuros(payment.amountCents)}</span>
        </li>
      ))}
    </ul>
  )
}
