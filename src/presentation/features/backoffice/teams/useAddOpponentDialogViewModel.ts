import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSectionAndTeamsDependencies } from '@presentation/di/hooks/use-section-and-teams-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

interface UseAddOpponentDialogViewModelParams {
  initialTeamId: string
  onSuccess: () => void
}

// specs/team-opponents.md §2.2/§2.6/AC-TO-15/AC-TO-16 — the team select is
// pre-selected on the originating row but editable; on success it is the
// CHOSEN team's list that gets invalidated, not the row's. Remounted via
// `key` by AddOpponentDialog (same pattern as TeamFormDialog).
export function useAddOpponentDialogViewModel({ initialTeamId, onSuccess }: UseAddOpponentDialogViewModelParams) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addOpponentToTeamUseCase } = useSectionAndTeamsDependencies()

  const [name, setName] = useState('')
  const [teamId, setTeamId] = useState(initialTeamId)

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) {
        // Unreachable in practice (admin session already required), keeps
        // the mutationFn total.
        throw new Error('No authenticated admin session.')
      }
      return addOpponentToTeamUseCase.execute({ actorId: user.id, teamId, name })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.teamOpponents(teamId) })
      onSuccess()
    },
  })

  return {
    name,
    setName,
    teamId,
    setTeamId,
    canSubmit: !!name.trim() && !!teamId && !mutation.isPending,
    isSubmitting: mutation.isPending,
    errorMessage: mutation.error ? mapDomainErrorToUiError(mutation.error).message : null,
    submit: () => mutation.mutate(),
  }
}
