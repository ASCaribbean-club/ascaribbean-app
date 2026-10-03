import type { Section } from '@domain/entities/section'
import { CollapsibleFilterPanel } from '@presentation/shared/components/CollapsibleFilterPanel'
import { SectionFilterChips } from '@presentation/shared/components/SectionFilterChips'
import { TeamFilterChips } from '@presentation/shared/components/TeamFilterChips'
import type { AvailabilityFilter } from '../availability-view'
import { AvailabilityFilterChips } from './AvailabilityFilterChips'

interface AvailabilityFiltersPanelProps {
  isExpanded: boolean
  onToggle: () => void
  // Shown on the header row while collapsed ("Seniors · Équipe A · Disponibles").
  activeFiltersSummary: string
  // Dirigeant only: section line, then team line (once a section is chosen).
  isOfficerView: boolean
  sections: Section[]
  areSectionsLoading: boolean
  selectedSectionId: string | null
  onSelectSection: (value: string) => void
  teamOptions: { id: string; name: string }[]
  selectedTeamId: string | null
  onSelectTeam: (teamId: string) => void
  // Status line.
  canFilterStatus: boolean
  chips: { value: AvailabilityFilter; label: string }[]
  filter: AvailabilityFilter
  onFilterChange: (filter: AvailabilityFilter) => void
}

// Every filter of the screen in the shared collapsible panel, one per line, in
// dependency order (section, team, status). Selections stay highlighted in
// their own line — never converted into another element.
export function AvailabilityFiltersPanel(props: AvailabilityFiltersPanelProps) {
  return (
    <CollapsibleFilterPanel isExpanded={props.isExpanded} onToggle={props.onToggle} summary={props.activeFiltersSummary}>
      {props.isOfficerView && (
        <SectionFilterChips
          sections={props.sections}
          selectedSectionId={props.selectedSectionId}
          isLoading={props.areSectionsLoading}
          onSelect={props.onSelectSection}
          bleedClassName="-mx-3.5 px-3.5"
        />
      )}
      {props.isOfficerView && props.selectedSectionId && props.teamOptions.length > 0 && (
        <TeamFilterChips teams={props.teamOptions} selectedTeamId={props.selectedTeamId} onSelect={props.onSelectTeam} />
      )}
      {props.canFilterStatus && <AvailabilityFilterChips chips={props.chips} selected={props.filter} onChange={props.onFilterChange} />}
    </CollapsibleFilterPanel>
  )
}
