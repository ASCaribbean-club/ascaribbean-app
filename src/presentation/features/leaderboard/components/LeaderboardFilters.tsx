import type { Section } from '@domain/entities/section'
import { CollapsibleFilterPanel } from '@presentation/shared/components/CollapsibleFilterPanel'
import { SectionFilterChips } from '@presentation/shared/components/SectionFilterChips'
import { TeamFilterChips } from '@presentation/shared/components/TeamFilterChips'

interface LeaderboardFiltersProps {
  isExpanded: boolean
  onToggle: () => void
  // Shown on the header row while collapsed ("Seniors · Équipe A").
  summary: string
  sections: Section[]
  areSectionsLoading: boolean
  selectedSectionId: string | null
  onSelectSection: (value: string) => void
  teamOptions: { id: string; name: string }[]
  selectedTeamId: string | null
  onSelectTeam: (teamId: string) => void
}

// Dirigeant habilité only: which team's ranking to read — section line, then
// team line once a section is chosen, in the shared collapsible panel. The
// ranking TYPE (buteurs, cartons, présence) stays in the tabs below, not here.
export function LeaderboardFilters(props: LeaderboardFiltersProps) {
  return (
    <CollapsibleFilterPanel isExpanded={props.isExpanded} onToggle={props.onToggle} summary={props.summary}>
      <SectionFilterChips
        sections={props.sections}
        selectedSectionId={props.selectedSectionId}
        isLoading={props.areSectionsLoading}
        onSelect={props.onSelectSection}
        bleedClassName="-mx-3.5 px-3.5"
      />
      {props.selectedSectionId && props.teamOptions.length > 0 && (
        <TeamFilterChips teams={props.teamOptions} selectedTeamId={props.selectedTeamId} onSelect={props.onSelectTeam} />
      )}
    </CollapsibleFilterPanel>
  )
}
