import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useClubOverviewDependencies } from '@presentation/di/hooks/use-club-overview-dependencies'
import { queryKeys } from '../query-keys'
import { useSectionFilter } from './use-section-filter'

// The Dirigeant habilité has no team of their own: on a per-team screen
// (availability, leaderboard) they pick a section (the filter shared with the
// dashboard and calendar), then a team of that section. Sections and teams are
// only read when `enabled` (the officer view is active). The team resolves to
// `undefined` until chosen; a section with a single team needs no second tap.
export function useOfficerTeamSelection(enabled: boolean) {
  const { sectionRepository, listClubTeamsUseCase } = useClubOverviewDependencies()
  const { sectionFilter, selectSection } = useSectionFilter()
  const [pickedTeamId, setPickedTeamId] = useState<string | null>(null)

  const sectionsQuery = useQuery({
    queryKey: queryKeys.clubSections(),
    queryFn: () => sectionRepository.findAll(),
    enabled,
  })
  // Current-season teams (the Dirigeant's convocation form uses the same read).
  const teamsQuery = useQuery({
    queryKey: queryKeys.clubTeams(),
    queryFn: () => listClubTeamsUseCase.execute(),
    enabled,
  })

  const sections = sectionsQuery.data ?? []
  const sectionTeams = sectionFilter ? (teamsQuery.data ?? []).filter((team) => team.sectionId === sectionFilter) : []
  const teamId =
    pickedTeamId && sectionTeams.some((team) => team.id === pickedTeamId)
      ? pickedTeamId
      : sectionTeams.length === 1
        ? sectionTeams[0].id
        : undefined

  return {
    sections,
    areSectionsLoading: sectionsQuery.isLoading,
    selectedSectionId: sectionFilter,
    selectedSectionName: sections.find((section) => section.id === sectionFilter)?.name ?? null,
    onSelectSection: (value: string) => {
      if (!value) return
      selectSection(value === 'all' ? null : value)
      setPickedTeamId(null)
    },
    teamOptions: sectionTeams.map((team) => ({ id: team.id, name: team.name })),
    teamId,
    selectedTeamName: sectionTeams.find((team) => team.id === teamId)?.name ?? null,
    onSelectTeam: setPickedTeamId,
  }
}
