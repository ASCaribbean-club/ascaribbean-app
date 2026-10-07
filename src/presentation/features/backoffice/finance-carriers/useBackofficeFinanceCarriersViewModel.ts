import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AdminFinanceCarrier } from '@domain/entities/finance'
import { FinanceCarrierArchiveRefusedError } from '@domain/errors/finance-carrier-archive-refused-error'
import { NotFoundError } from '@domain/errors/not-found-error'
import { useFinanceCarriersDependencies } from '@presentation/di/hooks/use-finance-carriers-dependencies'
import { FINANCE_CARRIER_ARCHIVE_MESSAGES, mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'

export type FinanceCarrierDialogState = { mode: 'create' } | { mode: 'edit'; carrier: AdminFinanceCarrier } | null

// specs/web-finance-carriers.md AC-FC-09/AC-FC-10 — the /admin/finance-carriers
// console. The read goes through ListFinanceCarriersForAdminUseCase (ordered by
// the repository: active first, archived after); create/update go through the
// dialog's own ViewModel; archive and restore are handled here
// (specs/finances-member-advances.md Part B). There is no delete state, ever.
export function useBackofficeFinanceCarriersViewModel() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { listFinanceCarriersForAdminUseCase, archiveFinanceCarrierUseCase, restoreFinanceCarrierUseCase } =
    useFinanceCarriersDependencies()
  // Computed independently of having reached this route
  // (backoffice:access already gated that). When false, the controls
  // disappear, never grayed out.
  const canCreate = usePermission('finance_carrier:create')
  const canUpdate = usePermission('finance_carrier:update')
  // AC-FA-19 — its own boolean, independent of canCreate / canUpdate: gates
  // BOTH "Archiver" and "Restaurer" (one action, PO-FA-06 default).
  const canArchive = usePermission('finance_carrier:archive')

  const [dialog, setDialog] = useState<FinanceCarrierDialogState>(null)
  // The row pending archive confirmation; never open together with `dialog`.
  const [pendingArchive, setPendingArchive] = useState<AdminFinanceCarrier | null>(null)

  const carriersQuery = useQuery({
    queryKey: queryKeys.financeCarriersAdminList(),
    queryFn: () => listFinanceCarriersForAdminUseCase.execute(),
  })

  // AC-FA-20 — after a success the list, /finances and the payment forms (all
  // under financesRoot) are refreshed on their next read.
  const refreshAfterArchiveChange = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.financeCarriersAdminRoot() })
    void queryClient.invalidateQueries({ queryKey: queryKeys.financesRoot() })
  }

  const archiveMutation = useMutation({
    mutationFn: (carrierId: string) => {
      if (!user) throw new Error('No authenticated admin session.')
      return archiveFinanceCarrierUseCase.execute({ actorId: user.id, carrierId })
    },
    onSuccess: () => {
      refreshAfterArchiveChange()
      setPendingArchive(null)
    },
    onError: (error) => {
      // The carrier vanished or is already archived: the list is reloaded so the
      // dialog's message and the table agree.
      if (error instanceof NotFoundError) refreshAfterArchiveChange()
    },
  })

  const restoreMutation = useMutation({
    mutationFn: (carrierId: string) => {
      if (!user) throw new Error('No authenticated admin session.')
      return restoreFinanceCarrierUseCase.execute({ actorId: user.id, carrierId })
    },
    onSuccess: refreshAfterArchiveChange,
    onError: refreshAfterArchiveChange,
  })

  // One cause, one message (AC-FA-20). A missing carrier reads as "gone or
  // already archived", never the generic "n'existe plus ou a été supprimé".
  const archiveErrorMessage = archiveMutation.error
    ? archiveMutation.error instanceof NotFoundError
      ? FINANCE_CARRIER_ARCHIVE_MESSAGES['already-archived']
      : mapDomainErrorToUiError(archiveMutation.error).message
    : null
  const restoreErrorMessage = restoreMutation.error
    ? restoreMutation.error instanceof NotFoundError || restoreMutation.error instanceof FinanceCarrierArchiveRefusedError
      ? FINANCE_CARRIER_ARCHIVE_MESSAGES['not-archived']
      : 'Impossible de restaurer le porteur. Réessayez.'
    : null

  return {
    isLoading: carriersQuery.isLoading,
    error: carriersQuery.error ? mapDomainErrorToUiError(carriersQuery.error) : null,
    rows: carriersQuery.data ?? [],
    canCreate,
    canUpdate,
    canArchive,

    dialog,
    openCreateDialog: () => setDialog({ mode: 'create' }),
    openEditDialog: (carrier: AdminFinanceCarrier) => setDialog({ mode: 'edit', carrier }),
    closeDialog: () => setDialog(null),

    pendingArchive,
    requestArchive: (carrier: AdminFinanceCarrier) => {
      // Drop a previous attempt's error so it doesn't show on a fresh dialog.
      archiveMutation.reset()
      setPendingArchive(carrier)
    },
    cancelArchive: () => {
      archiveMutation.reset()
      setPendingArchive(null)
    },
    confirmArchive: () => {
      if (!pendingArchive || archiveMutation.isPending) return
      archiveMutation.mutate(pendingArchive.id)
    },
    isArchiving: archiveMutation.isPending,
    archiveErrorMessage,

    // Restoration is reversible and non destructive: NO confirmation (UI-FA-10).
    restore: (carrier: AdminFinanceCarrier) => {
      if (restoreMutation.isPending) return
      restoreMutation.reset()
      restoreMutation.mutate(carrier.id)
    },
    restoringCarrierId: restoreMutation.isPending ? restoreMutation.variables : null,
    restoreErrorMessage,
  }
}
