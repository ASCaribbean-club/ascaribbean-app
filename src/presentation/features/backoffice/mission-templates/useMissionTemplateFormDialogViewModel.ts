import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MissionTemplateDialogState } from './useBackofficeMissionTemplatesViewModel'
import { useMissionTemplatesDependencies } from '@presentation/di/hooks/use-mission-templates-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'
import { missionTypeLabel } from './mission-template-view'

interface Params {
  dialog: NonNullable<MissionTemplateDialogState>
  onSuccess: () => void
}

// specs/web-mission-templates.md UI design "MissionTemplateFormDialog" — one
// hook for both modes; the dialog is remounted via `key` per opening, so the
// `useState` initializers run once (no reset effect).
export function useMissionTemplateFormDialogViewModel({ dialog, onSuccess }: Params) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { createMissionTemplateUseCase, updateMissionTemplateUseCase } = useMissionTemplatesDependencies()

  const [label, setLabel] = useState(dialog.mode === 'edit' ? dialog.missionTemplate.label : '')
  const [description, setDescription] = useState(dialog.mode === 'edit' ? (dialog.missionTemplate.description ?? '') : '')
  const [capacity, setCapacity] = useState(dialog.mode === 'edit' ? dialog.missionTemplate.defaultCapacity : 1)

  const convocationType = dialog.mode === 'edit' ? dialog.missionTemplate.convocationType : dialog.convocationType

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) {
        throw new Error('No authenticated admin session.')
      }
      if (dialog.mode === 'create') {
        return createMissionTemplateUseCase.execute({
          actorId: user.id,
          convocationType: dialog.convocationType,
          label,
          defaultCapacity: capacity,
          description,
        })
      }
      // Same row, never a duplicate; the type is not part of the input.
      return updateMissionTemplateUseCase.execute({
        actorId: user.id,
        missionTemplateId: dialog.missionTemplate.id,
        label,
        defaultCapacity: capacity,
        description,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.missionTemplatesRoot() })
      onSuccess()
    },
  })

  return {
    mode: dialog.mode,
    typeLabel: missionTypeLabel(convocationType),
    label,
    setLabel,
    description,
    setDescription,
    capacity,
    // A single-select toggle emits '' when the active item is clicked again:
    // ignored, the capacity can never be empty.
    selectCapacity: (value: string) => {
      if (value) setCapacity(Number(value))
    },
    canSubmit: !!label && !mutation.isPending,
    isSubmitting: mutation.isPending,
    errorMessage: mutation.error ? mapDomainErrorToUiError(mutation.error).message : null,
    submit: () => mutation.mutate(),
  }
}
