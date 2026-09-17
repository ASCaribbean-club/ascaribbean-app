import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Team } from '@domain/entities/team'
import { useSectionAndTeamsDependencies } from '@presentation/di/hooks/use-section-and-teams-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

export type TeamFormMode = 'create' | 'edit'

export interface TeamFormValues {
  name: string
  sectionId: string
  seasonId: string
}

const EMPTY_VALUES: TeamFormValues = { name: '', sectionId: '', seasonId: '' }

// AC-ST-24 — pre-filled from the edited row.
function toFormValues(team: Team | null): TeamFormValues {
  if (!team) return EMPTY_VALUES
  return { name: team.name, sectionId: team.sectionId, seasonId: team.seasonId }
}

interface UseTeamFormDialogViewModelParams {
  mode: TeamFormMode
  team: Team | null
  onSuccess: () => void
}

// specs/section-and-teams.md UI design — one hook backs both dialog modes,
// same remount-via-`key` pattern as useSectionFormDialogViewModel (see
// TeamFormDialog.tsx and that hook's own comment for why). The SECTION/
// SAISON dropdowns read the SAME centralized queryKeys
// (sectionsAdminList/seasonsAdminList) already warmed by
// useBackofficeTeamsViewModel — TanStack Query dedupes the request, this
// hook never re-fetches over the wire on a normal open.
export function useTeamFormDialogViewModel({ mode, team, onSuccess }: UseTeamFormDialogViewModelParams) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { sectionRepository, seasonRepository, createTeamUseCase, updateTeamUseCase } = useSectionAndTeamsDependencies()

  const [values, setValues] = useState<TeamFormValues>(() => toFormValues(team))

  function setField<K extends keyof TeamFormValues>(key: K, value: TeamFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const sectionsQuery = useQuery({ queryKey: queryKeys.sectionsAdminList(), queryFn: () => sectionRepository.findAll() })
  const seasonsQuery = useQuery({ queryKey: queryKeys.seasonsAdminList(), queryFn: () => seasonRepository.findAll() })
  const sections = sectionsQuery.data ?? []
  const seasons = seasonsQuery.data ?? []
  // §2.3/AC-ST-23 — the dialog stays usable when no section or no season
  // exists yet (club amorçage), rather than offering two silently empty
  // dropdowns.
  const isLoadingOptions = sectionsQuery.isLoading || seasonsQuery.isLoading

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) {
        // Unreachable in practice — RequireBackofficeAccess already gated
        // this screen on an admin session — but keeps the mutationFn total
        // rather than calling a use case with an empty actorId.
        throw new Error('No authenticated admin session.')
      }

      if (mode === 'create') {
        return createTeamUseCase.execute({
          actorId: user.id,
          name: values.name,
          sectionId: values.sectionId,
          seasonId: values.seasonId,
        })
      }

      // mode === 'edit': `team` is guaranteed non-null by TeamFormDialog's
      // own prop typing.
      return updateTeamUseCase.execute({
        actorId: user.id,
        teamId: team!.id,
        name: values.name,
        sectionId: values.sectionId,
        seasonId: values.seasonId,
      })
    },
    onSuccess: () => {
      // AC-ST-22 — centralized queryKeys: teams directly, sections too
      // since a new/moved team changes its section's ÉQUIPES count.
      void queryClient.invalidateQueries({ queryKey: queryKeys.teamsAdminList() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.sectionsAdminList() })
      onSuccess()
    },
  })

  const canSubmit =
    !!values.name.trim() && !!values.sectionId && !!values.seasonId && sections.length > 0 && seasons.length > 0 && !mutation.isPending

  // AC-ST-23 — on failure the dialog stays open with the typed values
  // untouched, and shows a French message translated from the DomainError.
  const errorMessage = mutation.error ? mapDomainErrorToUiError(mutation.error).message : null

  return {
    values,
    setName: (value: string) => setField('name', value),
    setSectionId: (value: string) => setField('sectionId', value),
    setSeasonId: (value: string) => setField('seasonId', value),

    sections,
    seasons,
    isLoadingOptions,

    canSubmit,
    isSubmitting: mutation.isPending,
    errorMessage,
    submit: () => mutation.mutate(),
  }
}
