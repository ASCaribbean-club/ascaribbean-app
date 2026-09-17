import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Section } from '@domain/entities/section'
import type { Season } from '@domain/entities/season'
import type { Team } from '@domain/entities/team'
import { seasonStatus, type SeasonStatus } from '@domain/policies/season-scope'
import type { TeamCoach } from '@domain/repositories/coach-repository'
import { useSectionAndTeamsDependencies } from '@presentation/di/hooks/use-section-and-teams-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'

export type TeamDialogState = { mode: 'create' } | { mode: 'edit'; team: Team } | null

export type TeamSectionFilter = string | 'all'
export type TeamSeasonFilter = string | 'all'
export type TeamCoachFilter = 'all' | 'with' | 'without'

export interface TeamAdminRow {
  team: Team
  sectionName: string
  season: Season | null
  seasonStatus: SeasonStatus
  coaches: TeamCoach[]
}

// specs/section-and-teams.md §2.7/§2.11 — same "no wrapping use case for a
// plain passthrough read" precedent as useBackofficeSectionsViewModel: four
// plain reads composed directly here (teamRepository.findAllForAdmin(),
// sectionRepository.findAll(), seasonRepository.findAll(),
// coachRepository.listAllAssignments()), RLS is the sole authority on what
// comes back (§2.6/§2.11). The two WRITES (create/update) go through a use
// case — see useTeamFormDialogViewModel. The coach ASSIGNMENT write goes
// through its own use case too — see useAssignCoachDialogViewModel.
export function useBackofficeTeamsViewModel() {
  const { teamRepository, sectionRepository, seasonRepository, coachRepository } = useSectionAndTeamsDependencies()
  // AC-ST-20 — computed independently of 'section:write'/'role:assign-coach'
  // (§3 UI design table) — never collapsed into one generic canWrite.
  const canWriteTeams = usePermission('team:write')
  const canAssignCoach = usePermission('role:assign-coach')

  const [sectionFilter, setSectionFilter] = useState<TeamSectionFilter>('all')
  const [seasonFilter, setSeasonFilter] = useState<TeamSeasonFilter>('all')
  const [coachFilter, setCoachFilter] = useState<TeamCoachFilter>('all')
  const [dialog, setDialog] = useState<TeamDialogState>(null)
  // AC-ST-45 — the row an "+ Coach" click came from is the dialog's
  // pre-checked/default target team.
  const [assignCoachTarget, setAssignCoachTarget] = useState<Team | null>(null)

  const teamsQuery = useQuery({ queryKey: queryKeys.teamsAdminList(), queryFn: () => teamRepository.findAllForAdmin() })
  const sectionsQuery = useQuery({ queryKey: queryKeys.sectionsAdminList(), queryFn: () => sectionRepository.findAll() })
  const seasonsQuery = useQuery({ queryKey: queryKeys.seasonsAdminList(), queryFn: () => seasonRepository.findAll() })
  const coachAssignmentsQuery = useQuery({
    queryKey: queryKeys.coachAssignmentsAdminList(),
    queryFn: () => coachRepository.listAllAssignments(),
  })

  const isLoading = teamsQuery.isLoading || sectionsQuery.isLoading || seasonsQuery.isLoading || coachAssignmentsQuery.isLoading
  const queryError = teamsQuery.error ?? sectionsQuery.error ?? seasonsQuery.error ?? coachAssignmentsQuery.error
  const error = queryError ? mapDomainErrorToUiError(queryError) : null

  const teams = teamsQuery.data ?? []
  const sections = sectionsQuery.data ?? []
  const seasons = seasonsQuery.data ?? []
  const coachAssignments = coachAssignmentsQuery.data ?? []

  const sectionsById = new Map<string, Section>(sections.map((section) => [section.id, section]))
  const seasonsById = new Map<string, Season>(seasons.map((season) => [season.id, season]))

  const now = new Date()
  const allRows: TeamAdminRow[] = teams.map((team) => {
    const season = seasonsById.get(team.seasonId) ?? null
    return {
      team,
      sectionName: sectionsById.get(team.sectionId)?.name ?? '',
      season,
      // §2.4/PO-ST-08 — reused predicate, three states supported, never
      // re-derived elsewhere (AC-ST-19).
      seasonStatus: season ? seasonStatus(season, now) : 'ended',
      coaches: coachAssignments.filter((assignment) => assignment.teamId === team.id).map((assignment) => assignment.coach),
    }
  })

  const rows = allRows.filter((row) => {
    if (sectionFilter !== 'all' && row.team.sectionId !== sectionFilter) return false
    if (seasonFilter !== 'all' && row.team.seasonId !== seasonFilter) return false
    if (coachFilter === 'with' && row.coaches.length === 0) return false
    if (coachFilter === 'without' && row.coaches.length > 0) return false
    return true
  })

  // AC-ST-44 — "sans coach" answers the EXACT same source as the COACH(S)
  // column (row.coaches, built above from the same coachAssignments read),
  // never a second calculation.
  const isFilterActive = sectionFilter !== 'all' || seasonFilter !== 'all' || coachFilter !== 'all'

  return {
    isLoading,
    error,
    rows,
    isFilterActive,
    canWriteTeams,
    canAssignCoach,

    sections,
    seasons,

    sectionFilter,
    setSectionFilter,
    seasonFilter,
    setSeasonFilter,
    coachFilter,
    setCoachFilter,

    dialog,
    openCreateDialog: () => setDialog({ mode: 'create' }),
    openEditDialog: (team: Team) => setDialog({ mode: 'edit', team }),
    closeDialog: () => setDialog(null),

    assignCoachTarget,
    openAssignCoachDialog: (team: Team) => setAssignCoachTarget(team),
    closeAssignCoachDialog: () => setAssignCoachTarget(null),
  }
}
