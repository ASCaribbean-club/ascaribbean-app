import { useQuery } from '@tanstack/react-query'
import type { Unavailability } from '@domain/entities/unavailability'
import { useTeamAvailabilityDependencies } from '@presentation/di/hooks/use-team-availability-dependencies'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'

export type EditableKind = Unavailability['kind']

// Loads what the edit sheet needs before the form mounts: the kinds the viewer
// may write, and the player's currently active records (to pre-fill / switch
// to "edit" instead of "declare"). The form's own state lives in
// useUnavailabilityFormViewModel, mounted once this has loaded.
export function useAvailabilityEditViewModel(teamId: string, playerId: string) {
  const { user } = useAuth()
  const { getActiveUnavailabilitiesUseCase } = useTeamAvailabilityDependencies()
  const canDeclareMedical = usePermission('availability:declare', { teamId })

  const activeQuery = useQuery({
    queryKey: queryKeys.playerUnavailabilities(playerId),
    queryFn: () => getActiveUnavailabilitiesUseCase.execute({ user: user!, teamId, playerId, now: new Date() }),
    enabled: !!user,
    // The sheet must always open on fresh data: a stale "active" record would
    // turn a declare into an update of something already lifted.
    gcTime: 0,
  })

  const kinds: EditableKind[] = canDeclareMedical ? ['medical', 'suspension'] : ['suspension']

  return {
    kinds,
    isLoading: activeQuery.isLoading,
    hasError: !!activeQuery.error,
    refetch: () => void activeQuery.refetch(),
    active: activeQuery.data ?? [],
  }
}
