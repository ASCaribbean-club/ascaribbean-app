import { useQuery } from '@tanstack/react-query'
import { useSectionAndTeamsDependencies } from '@presentation/di/hooks/use-section-and-teams-dependencies'
import { queryKeys } from '@presentation/shared/query-keys'

// specs/team-opponents.md §2.6/AC-TO-13 — the expanded row's read. Mounted
// only while the row is expanded (TeamOpponentsPanel), so the request is
// lazy; collapsing then re-expanding reuses the cache. Same key as the
// convocation form's "Adversaire" select (queryKeys.teamOpponents), so one
// invalidation refreshes both.
export function useTeamOpponentsViewModel(teamId: string) {
  const { opponentRepository } = useSectionAndTeamsDependencies()

  const query = useQuery({
    queryKey: queryKeys.teamOpponents(teamId),
    queryFn: () => opponentRepository.findByTeamId(teamId),
  })

  // UI design — stable alphabetical, case-insensitive order.
  const opponents = [...(query.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))

  return {
    isLoading: query.isLoading,
    hasError: !!query.error,
    opponents,
    isEmpty: !query.isLoading && !query.error && opponents.length === 0,
    retry: () => void query.refetch(),
  }
}
