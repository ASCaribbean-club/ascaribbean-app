import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTeamAvailabilityDependencies } from '@presentation/di/hooks/use-team-availability-dependencies'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { useAvailabilityTeamId } from '@presentation/shared/hooks/use-availability-team-id'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'
import {
  buildAvailabilityRows,
  countAvailability,
  filterAvailabilityRows,
  outCategoryLabels,
  type AvailabilityFilter,
} from './availability-view'

// specs/player-unavailability.md UI design §2 — the team availability list.
// All derivation (rows, counts, filter, wording per role) lives here or in
// availability-view.ts; the Page only branches on the booleans below.
export function useTeamAvailabilityViewModel() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { teamRepository, getTeamAvailabilityUseCase } = useTeamAvailabilityDependencies()
  const teamId = useAvailabilityTeamId()
  const [filter, setFilter] = useState<AvailabilityFilter>('all')

  // Routing decision made BEFORE the query fires (`enabled`), never merely
  // hiding a result that was fetched anyway. UX only — the RPC re-checks.
  const canReadTeam = usePermission('availability:read-team', { teamId })

  const teamQuery = useQuery({
    queryKey: queryKeys.team(teamId ?? ''),
    queryFn: () => teamRepository.findById(teamId!),
    enabled: !!teamId && canReadTeam,
  })

  const availabilityQuery = useQuery({
    queryKey: queryKeys.teamAvailability(teamId ?? ''),
    queryFn: () => getTeamAvailabilityUseCase.execute({ user: user!, teamId: teamId! }),
    enabled: !!user && !!teamId && canReadTeam,
  })

  const availability = availabilityQuery.data
  const rows = availability ? buildAvailabilityRows(availability) : []
  const visibleRows = filterAvailabilityRows(rows, filter)
  const labels = outCategoryLabels(availability?.view ?? 'teammate')

  return {
    isLoading: teamQuery.isLoading || availabilityQuery.isLoading,
    error: teamQuery.error ?? availabilityQuery.error,
    canReadTeam,
    refetch: () => {
      void teamQuery.refetch()
      void availabilityQuery.refetch()
    },

    title: 'Disponibilités',
    subtitle: teamQuery.data ? `${teamQuery.data.name} · ${rows.length} licenciés` : undefined,

    counts: countAvailability(rows),
    outLabel: labels.tile,
    chips: [
      { value: 'all', label: 'Tous' },
      { value: 'available', label: 'Disponibles' },
      { value: 'out', label: labels.chip },
      { value: 'suspended', label: 'Suspendus' },
    ] satisfies { value: AvailabilityFilter; label: string }[],
    filter,
    onFilterChange: setFilter,

    isRosterEmpty: availability !== undefined && rows.length === 0,
    isFilterEmpty: rows.length > 0 && visibleRows.length === 0,
    rows: visibleRows,

    goBack: () => navigate(-1),
  }
}
