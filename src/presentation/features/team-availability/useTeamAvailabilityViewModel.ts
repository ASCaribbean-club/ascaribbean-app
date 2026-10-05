import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTeamAvailabilityDependencies } from '@presentation/di/hooks/use-team-availability-dependencies'
import { useActiveRole } from '@presentation/shared/hooks/use-active-role'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { useAvailabilityTeamId } from '@presentation/shared/hooks/use-availability-team-id'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { useOfficerTeamSelection } from '@presentation/shared/hooks/use-officer-team-selection'
import { queryKeys } from '@presentation/shared/query-keys'
import {
  buildAvailabilityRows,
  countAvailability,
  filterAvailabilityRows,
  outCategoryLabels,
  isRowEditable,
  type AvailabilityFilter,
  type AvailabilityRowView,
} from './availability-view'

// specs/player-unavailability.md UI design §2 — the team availability list.
// All derivation (rows, counts, filter, wording per role) lives here or in
// availability-view.ts; the Page only branches on the booleans below.
export function useTeamAvailabilityViewModel() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { teamRepository, getTeamAvailabilityUseCase } = useTeamAvailabilityDependencies()
  const { isOfficerView } = useActiveRole()
  const ownTeamId = useAvailabilityTeamId()
  const [filter, setFilter] = useState<AvailabilityFilter>('all')
  // The filters panel (section, team, status) opens from the header icon: open
  // by default for the Dirigeant (it is how they pick a team), collapsed for
  // everyone else. A plain toggle, not persisted.
  const [areFiltersVisible, setAreFiltersVisible] = useState(isOfficerView)

  // Dirigeant habilité: section then team (shared with the leaderboard).
  const officer = useOfficerTeamSelection(isOfficerView)
  const teamId = isOfficerView ? officer.teamId : ownTeamId

  // Routing decision made BEFORE the query fires (`enabled`), never merely
  // hiding a result that was fetched anyway. UX only — the RPC re-checks.
  const canReadTeam = usePermission('availability:read-team', { teamId })
  // Edit (declare / modify / lift): UX only, the RLS policies are the gate.
  // Coach = medical + suspension on own teams; Dirigeant = suspension, club-wide.
  const canDeclareMedical = usePermission('availability:declare', { teamId })
  const canDeclareSuspension = usePermission('availability:declare-suspension', { teamId })
  const [editingRow, setEditingRow] = useState<AvailabilityRowView | null>(null)

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

  const chips = [
    { value: 'all', label: 'Tous' },
    { value: 'available', label: 'Disponibles' },
    { value: 'out', label: labels.chip },
    { value: 'suspended', label: 'Suspendus' },
  ] satisfies { value: AvailabilityFilter; label: string }[]

  // Shown in the collapsed panel header so a hidden filter is never a mystery.
  const activeFiltersSummary = [
    isOfficerView ? officer.selectedSectionName : null,
    isOfficerView ? officer.selectedTeamName : null,
    filter !== 'all' ? (chips.find((chip) => chip.value === filter)?.label ?? null) : null,
  ]
    .filter((part): part is string => part !== null)
    .join(' · ')

  return {
    isLoading: teamQuery.isLoading || availabilityQuery.isLoading,
    error: teamQuery.error ?? availabilityQuery.error,
    canReadTeam,
    refetch: () => {
      void teamQuery.refetch()
      void availabilityQuery.refetch()
    },

    // Dirigeant selectors (section then team) — booleans/lists only.
    isOfficerView,
    sections: officer.sections,
    areSectionsLoading: officer.areSectionsLoading,
    selectedSectionId: officer.selectedSectionId,
    onSelectSection: officer.onSelectSection,
    teamOptions: officer.teamOptions,
    selectedTeamId: officer.teamId ?? null,
    onSelectTeam: officer.onSelectTeam,
    // Officer with no team chosen yet: prompt instead of an empty list.
    needsTeamSelection: isOfficerView && !officer.teamId,
    needsSectionSelection: isOfficerView && !officer.selectedSectionId,

    areFiltersVisible,
    toggleFilters: () => setAreFiltersVisible((current) => !current),
    activeFiltersSummary,
    hasFilters: isOfficerView || !!teamId,
    // The status chips only make sense once a team's list is being read.
    canFilterStatus: !!teamId,

    title: 'Disponibilités',
    subtitle: teamQuery.data ? `${teamQuery.data.name} · ${rows.length} licenciés` : undefined,

    counts: countAvailability(rows),
    outLabel: labels.tile,
    chips,
    filter,
    onFilterChange: setFilter,

    isRosterEmpty: availability !== undefined && rows.length === 0,
    isFilterEmpty: rows.length > 0 && visibleRows.length === 0,
    rows: visibleRows,

    isRowEditable: (row: AvailabilityRowView) => isRowEditable(row, { canDeclareMedical, canDeclareSuspension }),
    editingRow,
    teamId,
    openEditor: (row: AvailabilityRowView) => setEditingRow(row),
    closeEditor: () => setEditingRow(null),

    goBack: () => navigate(-1),
  }
}
