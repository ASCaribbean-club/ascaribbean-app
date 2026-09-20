import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MembershipStatus } from '@domain/entities/membership'
import { useMembershipsDependencies } from '@presentation/di/hooks/use-memberships-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { eurosToCents } from '@presentation/shared/formatters/currency'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'
import type { MembershipAdminRow } from './useBackofficeMembershipsViewModel'

export interface MembershipEditRowValues {
  licenceNumber: string
  validUntil: string // yyyy-mm-dd, native <input type="date"> value
  status: MembershipStatus
  // §2.1/AC-WM-34 — kept in EUROS at the presentation boundary (the input's
  // own unit, "Cotisation totale (€)"), converted to integer cents only at
  // submit time (below) — never a float reaching the domain.
  amountDueEuros: string
}

// Developer decision (not spec'd by either web-seasons or web-memberships):
// when this membership doesn't carry its own amountDueCents yet, the field
// is pre-filled from the season's own reference cotisationAmount (§2.7)
// rather than left empty — a DEFAULT, still fully editable (AC-WM-26), never
// written anywhere until the admin actually submits this form. A membership
// that already has its own amountDueCents (even 0, "exonérée") always wins:
// the season's tarif is only ever a suggestion for the unset case.
function toEditValues(row: MembershipAdminRow): MembershipEditRowValues {
  const amountDueEuros =
    row.membership.amountDueCents !== null
      ? String(row.membership.amountDueCents / 100)
      : row.seasonCotisationAmount !== null
        ? String(row.seasonCotisationAmount)
        : ''
  return {
    licenceNumber: row.membership.licenceNumber ?? '',
    validUntil: row.membership.validUntil,
    status: row.membership.status,
    amountDueEuros,
  }
}

interface UseMembershipEditRowViewModelParams {
  row: MembershipAdminRow
  onSuccess: () => void
}

// specs/web-memberships.md §1/§2.4/§7/UI design "Ligne dépliable d'édition"
// (amendement du 2026-09-17) — the reconciled edit surface: an inline
// <tr>, not a dialog. UTILISATEUR/SAISON are NOT editable here (AC-WM-26,
// they're the row's own identity) — this hook never even reads them into
// form state. The account's own name/e-mail are read straight off `row`/
// `users` by the component, never through this hook (§2.10 — read, never
// written, from this screen).
export function useMembershipEditRowViewModel({ row, onSuccess }: UseMembershipEditRowViewModelParams) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { paymentRepository, updateMembershipUseCase } = useMembershipsDependencies()

  const [values, setValues] = useState<MembershipEditRowValues>(() => toEditValues(row))

  function setField<K extends keyof MembershipEditRowValues>(key: K, value: MembershipEditRowValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  // UI design, "HISTORIQUE DES VERSEMENTS" — the SAME centralized queryKey
  // RecordPaymentDialog uses for this same membership: opening this row
  // after (or instead of) that dialog never re-fetches, TanStack Query
  // dedupes.
  const paymentsQuery = useQuery({
    queryKey: queryKeys.membershipPayments(row.membership.id),
    queryFn: () => paymentRepository.listForMembership(row.membership.id),
  })
  const payments = paymentsQuery.data ?? []

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) {
        // Unreachable in practice — RequireBackofficeAccess already gated
        // this screen on an admin session.
        throw new Error('No authenticated admin session.')
      }
      const licenceNumber = values.licenceNumber.trim() || null
      // §2.1 — converted to integer cents HERE, at the presentation/domain
      // boundary, same discipline as RecordPaymentDialog's own amount field
      // (never inside the domain, never an unmanaged `× 100`). An empty
      // input clears the amount back to "not configured" (null), not 0.
      const amountDueCents = values.amountDueEuros.trim() === '' ? null : eurosToCents(Number(values.amountDueEuros))

      return updateMembershipUseCase.execute({
        actorId: user.id,
        membershipId: row.membership.id,
        userId: row.membership.userId,
        seasonId: row.membership.seasonId,
        licenceNumber,
        status: values.status,
        validUntil: values.validUntil,
        amountDueCents,
      })
    },
    onSuccess: () => {
      // AC-WM-24 — centralized queryKeys, invalidated so the row (status,
      // licence, valid_until, amount due) and the nav badge reflect the
      // change without a manual reload. Payment history is untouched by
      // this mutation (this panel never records a payment, §1), so
      // queryKeys.membershipPayments is left alone.
      void queryClient.invalidateQueries({ queryKey: queryKeys.membershipsAdminList() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.membershipsBadgeCount() })
      // specs/web-users-membership-column.md §2.5/AC-WU-59 — the licence
      // number is editable here, so criterion 3 of /admin/users' own
      // completeness read can flip too (not just criterion 2): invalidate
      // its two keys in addition to this screen's own.
      void queryClient.invalidateQueries({ queryKey: queryKeys.usersAdminDirectory() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.usersBadgeCount() })
      onSuccess()
    },
  })

  const parsedAmountDueEuros = values.amountDueEuros.trim() === '' ? null : Number(values.amountDueEuros)
  // AC-WM-34 (UI reflection) — mirrors the domain-level `>= 0` rejection: a
  // negative amount never reaches the submit button enabled, in addition to
  // the domain's own authoritative check.
  const hasValidAmountDue = parsedAmountDueEuros === null || (Number.isFinite(parsedAmountDueEuros) && parsedAmountDueEuros >= 0)
  const canSubmit = !!values.status && !!values.validUntil && hasValidAmountDue && !mutation.isPending

  // AC-WM-25/AC-WM-36 — on failure the panel stays open (deployed) with the
  // typed values kept, and shows a French message translated from the
  // DomainError (including MembershipActivationRequirementsNotMetError,
  // AC-WM-35).
  const errorMessage = mutation.error ? mapDomainErrorToUiError(mutation.error).message : null

  return {
    values,
    setLicenceNumber: (value: string) => setField('licenceNumber', value),
    setValidUntil: (value: string) => setField('validUntil', value),
    setStatus: (value: MembershipStatus) => setField('status', value),
    setAmountDueEuros: (value: string) => setField('amountDueEuros', value),

    isLoadingHistory: paymentsQuery.isLoading,
    payments,

    canSubmit,
    isSubmitting: mutation.isPending,
    errorMessage,
    submit: () => mutation.mutate(),
  }
}
