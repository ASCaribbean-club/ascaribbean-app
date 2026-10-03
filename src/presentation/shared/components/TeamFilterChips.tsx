import { FILTER_CHIP_CLASSNAME, FILTER_LABEL_CLASSNAME } from '@presentation/shared/components/filter-chip-styles'
import { ToggleGroup, ToggleGroupItem } from '@presentation/shared/components/ui/toggle-group'

interface TeamFilterChipsProps {
  teams: { id: string; name: string }[]
  selectedTeamId: string | null
  onSelect: (teamId: string) => void
}

// One chip per team of the chosen section — same look as SectionFilterChips,
// no "all" chip: the availability list is read for ONE team at a time.
export function TeamFilterChips({ teams, selectedTeamId, onSelect }: TeamFilterChipsProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className={FILTER_LABEL_CLASSNAME}>Équipe</h2>
      <div className="-mx-3.5 overflow-x-auto px-3.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ToggleGroup
          type="single"
          aria-label="Choisir une équipe"
          value={selectedTeamId ?? ''}
          // A re-tap on the active chip yields '' — ignored, a team stays selected.
          onValueChange={(value) => value && onSelect(value)}
          spacing={1.5}
          className="w-max"
        >
          {teams.map((team) => (
            <ToggleGroupItem key={team.id} value={team.id} className={FILTER_CHIP_CLASSNAME}>
              {team.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  )
}
