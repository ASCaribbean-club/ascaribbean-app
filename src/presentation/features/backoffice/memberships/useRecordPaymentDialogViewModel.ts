import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { membershipPaymentStatus, sumPaymentsCents } from '@domain/rules/membership-payment-rules'
import { useMembershipsDependencies } from '@presentation/di/hooks/use-memberships-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { toDateInputValue } from '@presentation/shared/formatters/date-input'
import { eurosToCents } from '@presentation/shared/formatters/currency'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'
import type { MembershipAdminRow } from './useBackofficeMembershipsViewModel'

interface UseRecordPaymentDialogViewModelParams {
  target: MembershipAdminRow
}

// specs/web-memberships.md UI design, "Nouveau composant — RecordPaymentDialog"
// — no maquette illustrates this dialog (§0/§1); composed from
// NewsFormDialog's form/submission shape plus a plain reverse-chronological
// history list, per that section's own note. Deliberately does NOT close
// itself on a successful submission (§1 point 3 — "plusieurs fois dans le
// temps pour une même adhésion"): the form resets and the history list grows
// in place, so recording two payments back to back never requires
// reopening the dialog. The parent (BackofficeMembershipsPage) owns whether
// the dialog is mounted at all.
export function useRecordPaymentDialogViewModel({ target }: UseRecordPaymentDialogViewModelParams) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { paymentRepository, recordPaymentUseCase } = useMembershipsDependencies()

  const paymentsQuery = useQuery({
    queryKey: queryKeys.membershipPayments(target.membership.id),
    queryFn: () => paymentRepository.listForMembership(target.membership.id),
  })
  const payments = paymentsQuery.data ?? []
  // AC-WM-13 — the SAME predicate as the COTISATION column/filter, recomputed
  // here from this dialog's OWN per-membership read (queryKeys.membershipPayments)
  // rather than reused from `target.paidCents` — the two should agree, but a
  // payment recorded in this very dialog invalidates this key specifically,
  // and this hook renders the context line from its own live data rather
  // than from a snapshot taken before the dialog opened.
  const paidCents = sumPaymentsCents(payments)
  // effectiveAmountDueCents, not the raw membership field — same fallback to
  // the season's own tarif as the COTISATION column, see that field's own
  // comment on MembershipAdminRow (display only, never the activation rule).
  const paymentStatus = membershipPaymentStatus(paidCents, target.effectiveAmountDueCents)

  const [amountEuros, setAmountEuros] = useState('')
  const [paidAt, setPaidAt] = useState(() => toDateInputValue(new Date()))

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) {
        // Unreachable in practice — RequireBackofficeAccess already gated
        // this screen on an admin session.
        throw new Error('No authenticated admin session.')
      }
      // §2.2 — converted to integer cents HERE, at the presentation/domain
      // boundary, never inside the domain itself (which only ever accepts
      // already-integer cents) and never via an unmanaged `× 100` at the
      // input's own onChange.
      return recordPaymentUseCase.execute({
        actorId: user.id,
        membershipId: target.membership.id,
        amountCents: eurosToCents(Number(amountEuros)),
        paidAt,
      })
    },
    onSuccess: () => {
      // AC-WM-24 — the history list (this dialog's own + MembershipEditRow's
      // shared column, same key), the COTISATION cell of EVERY row (the
      // bulk-fetched admin payments list the whole table's paidCents is
      // derived from), and the nav badge all update without a manual reload.
      void queryClient.invalidateQueries({ queryKey: queryKeys.membershipPayments(target.membership.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.membershipPaymentsAdminList() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.membershipsBadgeCount() })
      setAmountEuros('')
      setPaidAt(toDateInputValue(new Date()))
    },
  })

  const parsedAmountEuros = Number(amountEuros)
  // AC-WM-16 (UI reflection) — mirrors the domain-level rejection: a
  // strictly positive amount and a paidAt are both required before the
  // submit button is even enabled. No client-side cap against amountDueCents
  // (PO-WM-02 non-blocking — a cap would preempt that arbitration, §UI
  // design "aucun plafond client contre le montant dû").
  const canSubmit = amountEuros.trim() !== '' && Number.isFinite(parsedAmountEuros) && parsedAmountEuros > 0 && !!paidAt && !mutation.isPending

  // AC-WM-25 — on failure the dialog stays open, the typed values kept,
  // French message translated from the DomainError.
  const errorMessage = mutation.error ? mapDomainErrorToUiError(mutation.error).message : null

  return {
    isLoadingHistory: paymentsQuery.isLoading,
    payments,
    paidCents,
    paymentStatus,

    amountEuros,
    setAmountEuros,
    paidAt,
    setPaidAt,

    canSubmit,
    isSubmitting: mutation.isPending,
    errorMessage,
    submit: () => mutation.mutate(),
  }
}
