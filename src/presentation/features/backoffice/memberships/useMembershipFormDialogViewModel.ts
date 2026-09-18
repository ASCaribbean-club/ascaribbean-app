import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MembershipStatus } from '@domain/entities/membership'
import { useMembershipsDependencies } from '@presentation/di/hooks/use-memberships-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

export interface MembershipFormValues {
  userId: string
  seasonId: string
  licenceNumber: string
  status: MembershipStatus | ''
  validUntil: string // yyyy-mm-dd, native <input type="date"> value
}

const EMPTY_VALUES: MembershipFormValues = { userId: '', seasonId: '', licenceNumber: '', status: '', validUntil: '' }

interface UseMembershipFormDialogViewModelParams {
  onSuccess: () => void
}

// specs/web-memberships.md UI design (amendement du 2026-09-17) — backs
// ONLY the "Nouvelle adhésion" dialog now: modification moved to the inline
// expandable row (useMembershipEditRowViewModel), which is why this hook no
// longer takes a mode/membership pair the way the earlier pass's shared
// create/edit hook did. Same remount-via-`key` pattern as
// useSeasonFormDialogViewModel/useTeamFormDialogViewModel (see
// MembershipFormDialog.tsx). The UTILISATEUR/SAISON dropdowns read the SAME
// centralized queryKeys already warmed by useBackofficeMembershipsViewModel
// — TanStack Query dedupes.
export function useMembershipFormDialogViewModel({ onSuccess }: UseMembershipFormDialogViewModelParams) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { userRepository, seasonRepository, createMembershipUseCase } = useMembershipsDependencies()

  const [values, setValues] = useState<MembershipFormValues>(EMPTY_VALUES)

  function setField<K extends keyof MembershipFormValues>(key: K, value: MembershipFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const usersQuery = useQuery({ queryKey: queryKeys.usersAdminList(), queryFn: () => userRepository.findAll() })
  const seasonsQuery = useQuery({ queryKey: queryKeys.seasonsAdminList(), queryFn: () => seasonRepository.findAll() })
  const users = usersQuery.data ?? []
  const seasons = seasonsQuery.data ?? []
  const isLoadingOptions = usersQuery.isLoading || seasonsQuery.isLoading

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) {
        // Unreachable in practice — RequireBackofficeAccess already gated
        // this screen on an admin session — but keeps the mutationFn total
        // rather than calling a use case with an empty actorId.
        throw new Error('No authenticated admin session.')
      }
      // canSubmit already guarantees values.status is non-empty at this
      // point — the cast reflects that a real MembershipStatus has been
      // chosen, not a new assumption made here.
      const status = values.status as MembershipStatus
      const licenceNumber = values.licenceNumber.trim() || null

      // §2.1 — no amountDueCents field here: the "Nouvelle adhésion" dialog
      // never carries it (CreateMembershipUseCase sets it to null itself).
      return createMembershipUseCase.execute({
        actorId: user.id,
        userId: values.userId,
        seasonId: values.seasonId,
        licenceNumber,
        status,
        validUntil: values.validUntil,
      })
    },
    onSuccess: () => {
      // AC-WM-24 — centralized queryKeys, invalidated so the list AND the
      // nav badge reflect the change without a manual reload.
      void queryClient.invalidateQueries({ queryKey: queryKeys.membershipsAdminList() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.membershipsBadgeCount() })
      onSuccess()
    },
  })

  const canSubmit = !!values.userId && !!values.seasonId && !!values.status && !!values.validUntil && !mutation.isPending

  // AC-WM-25 — on failure the dialog stays open with the typed values
  // untouched, and shows a French message translated from the DomainError
  // (e.g. DuplicateMembershipError, ArchivedMembershipHasPaymentsError or
  // MembershipActivationRequirementsNotMetError).
  const errorMessage = mutation.error ? mapDomainErrorToUiError(mutation.error).message : null

  return {
    values,
    setUserId: (value: string) => setField('userId', value),
    setSeasonId: (value: string) => setField('seasonId', value),
    setLicenceNumber: (value: string) => setField('licenceNumber', value),
    setStatus: (value: MembershipStatus) => setField('status', value),
    setValidUntil: (value: string) => setField('validUntil', value),

    users,
    seasons,
    isLoadingOptions,

    canSubmit,
    isSubmitting: mutation.isPending,
    errorMessage,
    submit: () => mutation.mutate(),
  }
}
