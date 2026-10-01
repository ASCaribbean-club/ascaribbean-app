import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TrainingLocation } from '@domain/entities/training-location'
import { useTrainingLocationsDependencies } from '@presentation/di/hooks/use-training-locations-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'

export type TrainingLocationDialogState = { mode: 'create' } | { mode: 'edit'; trainingLocation: TrainingLocation } | null

// specs/web-localizations.md §2.5/AC-WL-13..15 — the /admin/locations
// console. The read goes through ListTrainingLocationsUseCase (every row,
// archived included, ordered by the repository); the three writes go
// through a use case each: create/update in useTrainingLocationFormDialogViewModel,
// archive here (it's confirmed from this screen's own AlertDialog).
export function useBackofficeLocalizationsViewModel() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { listTrainingLocationsUseCase, archiveTrainingLocationUseCase } = useTrainingLocationsDependencies()
  // AC-WL-14 — computed independently of having reached this route
  // (backoffice:access already gated that). Drives "+ Nouveau lieu", the
  // pencil and "Archiver": when false they disappear, never grayed out.
  const canWrite = usePermission('training_location:write')

  const [dialog, setDialog] = useState<TrainingLocationDialogState>(null)
  // The row pending archive confirmation (PO-WL-14 proposal: a confirmation
  // step, since archiving has no way back in the UI). Never open together
  // with `dialog`.
  const [pendingArchive, setPendingArchive] = useState<TrainingLocation | null>(null)

  const locationsQuery = useQuery({
    queryKey: queryKeys.trainingLocationsAdminList(),
    queryFn: () => listTrainingLocationsUseCase.execute(),
  })

  const archiveMutation = useMutation({
    mutationFn: (trainingLocationId: string) => {
      if (!user) {
        // Unreachable in practice — RequireBackofficeAccess already gated
        // this screen on an admin session.
        throw new Error('No authenticated admin session.')
      }
      return archiveTrainingLocationUseCase.execute({ actorId: user.id, trainingLocationId })
    },
    onSuccess: () => {
      // AC-WL-15 — ONE invalidation of the shared root refreshes both the
      // admin list and the mobile selector's list.
      void queryClient.invalidateQueries({ queryKey: queryKeys.trainingLocationsRoot() })
      setPendingArchive(null)
    },
  })

  return {
    isLoading: locationsQuery.isLoading,
    error: locationsQuery.error ? mapDomainErrorToUiError(locationsQuery.error) : null,
    rows: locationsQuery.data ?? [],
    canWrite,

    dialog,
    openCreateDialog: () => setDialog({ mode: 'create' }),
    openEditDialog: (trainingLocation: TrainingLocation) => setDialog({ mode: 'edit', trainingLocation }),
    closeDialog: () => setDialog(null),

    pendingArchive,
    requestArchive: (trainingLocation: TrainingLocation) => {
      // Drop a previous attempt's error so it doesn't show on a fresh dialog.
      archiveMutation.reset()
      setPendingArchive(trainingLocation)
    },
    cancelArchive: () => {
      archiveMutation.reset()
      setPendingArchive(null)
    },
    confirmArchive: () => pendingArchive && archiveMutation.mutate(pendingArchive.id),
    isArchiving: archiveMutation.isPending,
    archiveErrorMessage: archiveMutation.error ? mapDomainErrorToUiError(archiveMutation.error).message : null,
  }
}
