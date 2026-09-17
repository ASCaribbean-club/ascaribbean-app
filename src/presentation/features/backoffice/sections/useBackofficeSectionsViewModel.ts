import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Section, SectionType } from '@domain/entities/section'
import type { TeamCoach } from '@domain/repositories/coach-repository'
import { useSectionAndTeamsDependencies } from '@presentation/di/hooks/use-section-and-teams-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'

export type SectionDialogState = { mode: 'create' } | { mode: 'edit'; section: Section } | null

export type SectionTypeFilter = SectionType | 'all'

export interface SectionAdminRow {
  section: Section
  // §2.3/AC-ST-18 — derived count, never read from a column. §2.7/PO-ST-07
  // (amended) — counted across every season, the only reading consistent
  // with the mockup's own numbers (a section can show 3 teams even though
  // only 2 are in the current season).
  teamCount: number
  // §2.11/AC-ST-43 — coaches DISTINCT across every team of this section
  // (deduplicated by user id), same season scope as teamCount (PO-ST-07).
  coaches: TeamCoach[]
}

// specs/section-and-teams.md §2.7/§2.11 — three plain reads composed
// directly here (sectionRepository.findAll(), teamRepository.findAllForAdmin(),
// coachRepository.listAllAssignments()), same "no wrapping use case for a
// plain passthrough read" precedent as useBackofficeSeasonsViewModel: there
// is no business rule between "authenticated admin token" and these three
// row sets, RLS is the sole authority on what comes back (§2.6/§2.11). The
// two WRITES (create/update) each go through a use case — see
// useSectionFormDialogViewModel.
export function useBackofficeSectionsViewModel() {
  const { sectionRepository, teamRepository, coachRepository } = useSectionAndTeamsDependencies()
  // AC-ST-20 — computed independently of having reached this route
  // (backoffice:access already gated that), and kept structurally SEPARATE
  // from 'team:write'/'role:assign-coach' (§3 UI design table) — never
  // collapsed into one generic canWrite.
  const canWriteSections = usePermission('section:write')

  const [typeFilter, setTypeFilter] = useState<SectionTypeFilter>('all')
  const [dialog, setDialog] = useState<SectionDialogState>(null)

  const sectionsQuery = useQuery({ queryKey: queryKeys.sectionsAdminList(), queryFn: () => sectionRepository.findAll() })
  const teamsQuery = useQuery({ queryKey: queryKeys.teamsAdminList(), queryFn: () => teamRepository.findAllForAdmin() })
  const coachAssignmentsQuery = useQuery({
    queryKey: queryKeys.coachAssignmentsAdminList(),
    queryFn: () => coachRepository.listAllAssignments(),
  })

  const isLoading = sectionsQuery.isLoading || teamsQuery.isLoading || coachAssignmentsQuery.isLoading
  const queryError = sectionsQuery.error ?? teamsQuery.error ?? coachAssignmentsQuery.error
  const error = queryError ? mapDomainErrorToUiError(queryError) : null

  const teams = teamsQuery.data ?? []
  const coachAssignments = coachAssignmentsQuery.data ?? []

  const allRows: SectionAdminRow[] = (sectionsQuery.data ?? []).map((section) => {
    const sectionTeamIds = new Set(teams.filter((team) => team.sectionId === section.id).map((team) => team.id))
    const coachesById = new Map<string, TeamCoach>()
    for (const assignment of coachAssignments) {
      if (sectionTeamIds.has(assignment.teamId)) {
        coachesById.set(assignment.coach.id, assignment.coach)
      }
    }
    return { section, teamCount: sectionTeamIds.size, coaches: Array.from(coachesById.values()) }
  })

  const rows = typeFilter === 'all' ? allRows : allRows.filter((row) => row.section.type === typeFilter)
  // §2.7 UI design point 7 — "résultat de filtre vide" is a distinct state
  // from "no section exists at all", covered by the Page rendering
  // BackofficeEmptyState with a different title/description when this is
  // true (never re-derived in the component).
  const isFilterActive = typeFilter !== 'all'

  return {
    isLoading,
    error,
    rows,
    isFilterActive,
    canWriteSections,

    typeFilter,
    setTypeFilter,

    dialog,
    openCreateDialog: () => setDialog({ mode: 'create' }),
    openEditDialog: (section: Section) => setDialog({ mode: 'edit', section }),
    closeDialog: () => setDialog(null),
  }
}
