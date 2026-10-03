import { FILTER_CHIP_CLASSNAME, FILTER_LABEL_CLASSNAME } from '@presentation/shared/components/filter-chip-styles'
import { ToggleGroup, ToggleGroupItem } from '@presentation/shared/components/ui/toggle-group'
import { cn } from '@presentation/shared/lib/utils'
import type { AvailabilityFilter } from '../availability-view'

interface AvailabilityFilterChipsProps {
  chips: { value: AvailabilityFilter; label: string }[]
  selected: AvailabilityFilter
  onChange: (filter: AvailabilityFilter) => void
}

// Same colours as AvailabilityBadge, so a chip announces the badge it filters.
// The label always accompanies the dot (never colour alone).
const DOT_CLASSNAME: Record<AvailabilityFilter, string | null> = {
  all: null,
  available: 'bg-coach-green',
  out: 'bg-coach-amber',
  suspended: 'bg-coach-red',
}

// Single-select, one scrolling row like the section/team chips. A re-tap on the
// active chip yields '' and is ignored: "Tous" is the neutral state.
export function AvailabilityFilterChips({ chips, selected, onChange }: AvailabilityFilterChipsProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className={FILTER_LABEL_CLASSNAME}>Statut</h2>
      <div className="-mx-3.5 overflow-x-auto px-3.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ToggleGroup
          type="single"
          aria-label="Filtrer par statut"
          value={selected}
          onValueChange={(value) => value && onChange(value as AvailabilityFilter)}
          spacing={1.5}
          className="w-max"
        >
          {chips.map((chip) => (
            <ToggleGroupItem key={chip.value} value={chip.value} className={FILTER_CHIP_CLASSNAME}>
              {DOT_CLASSNAME[chip.value] && <span aria-hidden className={cn('size-2 rounded-full', DOT_CLASSNAME[chip.value])} />}
              {chip.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  )
}
