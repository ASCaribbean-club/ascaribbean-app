import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AdminFinanceCarrier, CarrierKind } from '@domain/entities/finance'
import {
  MAX_CARRIER_DETAIL_LENGTH,
  MAX_CARRIER_LABEL_LENGTH,
  hasCarrierChanged,
  normalizeCarrierLabel,
  validateCarrierDetail,
} from '@domain/rules/finance-carrier-rules'
import { useFinanceCarriersDependencies } from '@presentation/di/hooks/use-finance-carriers-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

export type FinanceCarrierFormMode = 'create' | 'edit'

export interface FinanceCarrierFormValues {
  label: string
  // '' = not chosen yet (create only; no preselection, PO-FC-01).
  kind: CarrierKind | ''
  detail: string
  // '' = no manager.
  managerUserId: string
}

export interface ManagerOption {
  value: string
  label: string
}

function toFormValues(carrier: AdminFinanceCarrier | null): FinanceCarrierFormValues {
  if (!carrier) return { label: '', kind: '', detail: '', managerUserId: '' }
  return { label: carrier.label, kind: carrier.kind, detail: carrier.detail ?? '', managerUserId: carrier.managerUserId ?? '' }
}

interface UseFinanceCarrierFormDialogViewModelParams {
  mode: FinanceCarrierFormMode
  // null in 'create' mode; the row being edited in 'edit' mode (pre-filled).
  carrier: AdminFinanceCarrier | null
  onSuccess: () => void
}

// specs/web-finance-carriers.md UI design, "FinanceCarrierFormDialog" — one
// hook backs both modes, remounted via `key` (useState initializer, no
// useEffect reset). In 'edit' mode `kind` is read-only and never sent.
export function useFinanceCarrierFormDialogViewModel({ mode, carrier, onSuccess }: UseFinanceCarrierFormDialogViewModelParams) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { userRepository, createFinanceCarrierUseCase, updateFinanceCarrierUseCase } = useFinanceCarriersDependencies()

  const [values, setValues] = useState<FinanceCarrierFormValues>(() => toFormValues(carrier))

  // Account list of the manager selector: displayable name only (AC-FC-11).
  // A failure never blocks saving (UI design): the field stays on "none".
  const usersQuery = useQuery({ queryKey: queryKeys.usersAdminList(), queryFn: () => userRepository.findAll() })
  const managerOptions: ManagerOption[] = [...(usersQuery.data ?? [])]
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'fr'))
    .map((account) => ({ value: account.id, label: account.fullName }))

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) {
        // Unreachable in practice — RequireBackofficeAccess already gated
        // this screen on an admin session.
        throw new Error('No authenticated admin session.')
      }
      const managerUserId = values.managerUserId === '' ? null : values.managerUserId

      if (mode === 'create') {
        return createFinanceCarrierUseCase.execute({
          actorId: user.id,
          label: values.label,
          kind: values.kind,
          detail: values.detail,
          managerUserId,
        })
      }

      // mode === 'edit': writes the SAME row; `kind` is never passed.
      return updateFinanceCarrierUseCase.execute({
        actorId: user.id,
        carrierId: carrier!.id,
        label: values.label,
        detail: values.detail,
        managerUserId,
      })
    },
    onSuccess: () => {
      // AC-FC-12 — the admin list AND the Finances keys (snapshot, carriers
      // read of the payment forms, all under financesRoot).
      void queryClient.invalidateQueries({ queryKey: queryKeys.financeCarriersAdminRoot() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.financesRoot() })
      onSuccess()
    },
  })

  const labelValid = normalizeCarrierLabel(values.label) !== '' && normalizeCarrierLabel(values.label).length <= MAX_CARRIER_LABEL_LENGTH
  const detailValid = validateCarrierDetail(values.detail) === null
  const kindValid = mode === 'edit' || values.kind !== ''
  // Edit: disabled while unchanged (AC-FC-12). The duplicate check stays the
  // use case's / database's job.
  const changed =
    mode === 'create' ||
    hasCarrierChanged(
      { label: carrier!.label, detail: carrier!.detail, managerUserId: carrier!.managerUserId },
      { label: values.label, detail: values.detail, managerUserId: values.managerUserId === '' ? null : values.managerUserId },
    )
  const canSubmit = labelValid && detailValid && kindValid && changed && !mutation.isPending

  return {
    values,
    kindLabelReadOnly: mode === 'edit',
    maxLabelLength: MAX_CARRIER_LABEL_LENGTH,
    maxDetailLength: MAX_CARRIER_DETAIL_LENGTH,
    setLabel: (value: string) => setValues((current) => ({ ...current, label: value })),
    setKind: (value: CarrierKind) => setValues((current) => ({ ...current, kind: value })),
    setDetail: (value: string) => setValues((current) => ({ ...current, detail: value })),
    setManagerUserId: (value: string) => setValues((current) => ({ ...current, managerUserId: value })),

    managerOptions,
    managersUnavailable: !!usersQuery.error,
    isLoadingManagers: usersQuery.isLoading,

    canSubmit,
    isSubmitting: mutation.isPending,
    // On failure the dialog stays open with the typed values untouched and a
    // French message — never raw Supabase text.
    errorMessage: mutation.error ? mapDomainErrorToUiError(mutation.error).message : null,
    submit: () => mutation.mutate(),
  }
}
