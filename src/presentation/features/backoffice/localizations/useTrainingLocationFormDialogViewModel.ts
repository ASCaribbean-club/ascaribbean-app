import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { TrainingLocation } from '@domain/entities/training-location'
import { useTrainingLocationsDependencies } from '@presentation/di/hooks/use-training-locations-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

export type TrainingLocationFormMode = 'create' | 'edit'

export interface TrainingLocationFormValues {
  name: string
  address: string
}

const EMPTY_VALUES: TrainingLocationFormValues = { name: '', address: '' }

function toFormValues(trainingLocation: TrainingLocation | null): TrainingLocationFormValues {
  if (!trainingLocation) return EMPTY_VALUES
  return { name: trainingLocation.name, address: trainingLocation.address }
}

interface UseTrainingLocationFormDialogViewModelParams {
  mode: TrainingLocationFormMode
  // null in 'create' mode; the row being edited in 'edit' mode (pre-filled).
  trainingLocation: TrainingLocation | null
  onSuccess: () => void
}

// specs/web-localizations.md UI design, "TrainingLocationFormDialog" — one
// hook backs both modes, same remount-via-`key` pattern as
// useSeasonFormDialogViewModel (the `useState` initializer runs once per
// dialog opening; no useEffect reset that could clobber a half-typed form).
export function useTrainingLocationFormDialogViewModel({
  mode,
  trainingLocation,
  onSuccess,
}: UseTrainingLocationFormDialogViewModelParams) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { createTrainingLocationUseCase, updateTrainingLocationUseCase } = useTrainingLocationsDependencies()

  const [values, setValues] = useState<TrainingLocationFormValues>(() => toFormValues(trainingLocation))

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) {
        // Unreachable in practice — RequireBackofficeAccess already gated
        // this screen on an admin session.
        throw new Error('No authenticated admin session.')
      }

      if (mode === 'create') {
        return createTrainingLocationUseCase.execute({ actorId: user.id, name: values.name, address: values.address })
      }

      // mode === 'edit': writes the SAME row, never a duplicate.
      return updateTrainingLocationUseCase.execute({
        actorId: user.id,
        trainingLocationId: trainingLocation!.id,
        name: values.name,
        address: values.address,
      })
    },
    onSuccess: () => {
      // AC-WL-15 — one invalidation of the shared root (admin list AND
      // mobile selector list).
      void queryClient.invalidateQueries({ queryKey: queryKeys.trainingLocationsRoot() })
      onSuccess()
    },
  })

  // Only checks presence for the button state; trimming and the real
  // "empty after trim" refusal belong to the use case.
  const canSubmit = !!values.name && !!values.address && !mutation.isPending

  // On failure the dialog stays open with the typed values untouched, and
  // shows a French message translated from the DomainError — never raw
  // Supabase text.
  const errorMessage = mutation.error ? mapDomainErrorToUiError(mutation.error).message : null

  return {
    values,
    setName: (value: string) => setValues((current) => ({ ...current, name: value })),
    setAddress: (value: string) => setValues((current) => ({ ...current, address: value })),

    canSubmit,
    isSubmitting: mutation.isPending,
    errorMessage,
    submit: () => mutation.mutate(),
  }
}
