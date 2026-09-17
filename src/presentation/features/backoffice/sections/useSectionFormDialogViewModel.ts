import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Section, SectionType } from '@domain/entities/section'
import { useSectionAndTeamsDependencies } from '@presentation/di/hooks/use-section-and-teams-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

export type SectionFormMode = 'create' | 'edit'

export interface SectionFormValues {
  name: string
  type: SectionType | ''
}

const EMPTY_VALUES: SectionFormValues = { name: '', type: '' }

// AC-ST-24 — pre-filled from the edited row.
function toFormValues(section: Section | null): SectionFormValues {
  if (!section) return EMPTY_VALUES
  return { name: section.name, type: section.type }
}

interface UseSectionFormDialogViewModelParams {
  mode: SectionFormMode
  section: Section | null
  onSuccess: () => void
}

// specs/section-and-teams.md UI design — one hook backs both dialog modes,
// same remount-via-`key` pattern as useSeasonFormDialogViewModel (see
// SectionFormDialog.tsx and that hook's own comment for why).
export function useSectionFormDialogViewModel({ mode, section, onSuccess }: UseSectionFormDialogViewModelParams) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { createSectionUseCase, updateSectionUseCase } = useSectionAndTeamsDependencies()

  const [values, setValues] = useState<SectionFormValues>(() => toFormValues(section))

  function setField<K extends keyof SectionFormValues>(key: K, value: SectionFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) {
        // Unreachable in practice — RequireBackofficeAccess already gated
        // this screen on an admin session — but keeps the mutationFn total
        // rather than calling a use case with an empty actorId.
        throw new Error('No authenticated admin session.')
      }

      if (mode === 'create') {
        return createSectionUseCase.execute({ actorId: user.id, name: values.name, type: values.type })
      }

      // mode === 'edit': `section` is guaranteed non-null by
      // SectionFormDialog's own prop typing.
      return updateSectionUseCase.execute({
        actorId: user.id,
        sectionId: section!.id,
        name: values.name,
        type: values.type,
      })
    },
    onSuccess: () => {
      // AC-ST-22 — centralized queryKeys, both admin lists invalidated:
      // sections directly, teams too since TeamFormDialog's SECTION
      // dropdown and TeamTable's SECTION column read the same section rows.
      void queryClient.invalidateQueries({ queryKey: queryKeys.sectionsAdminList() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.teamsAdminList() })
      onSuccess()
    },
  })

  const canSubmit = !!values.name.trim() && !!values.type && !mutation.isPending

  // AC-ST-23 — on failure the dialog stays open with the typed values
  // untouched, and shows a French message translated from the DomainError.
  const errorMessage = mutation.error ? mapDomainErrorToUiError(mutation.error).message : null

  return {
    values,
    setName: (value: string) => setField('name', value),
    setType: (value: SectionType) => setField('type', value),

    canSubmit,
    isSubmitting: mutation.isPending,
    errorMessage,
    submit: () => mutation.mutate(),
  }
}
