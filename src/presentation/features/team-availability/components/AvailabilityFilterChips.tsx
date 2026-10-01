import { Button } from '@presentation/shared/components/ui/button'
import { cn } from '@presentation/shared/lib/utils'
import type { AvailabilityFilter } from '../availability-view'

interface AvailabilityFilterChipsProps {
  chips: { value: AvailabilityFilter; label: string }[]
  selected: AvailabilityFilter
  onChange: (filter: AvailabilityFilter) => void
}

// Single-select, wraps instead of scrolling sideways, each chip h-11 (touch target).
export function AvailabilityFilterChips({ chips, selected, onChange }: AvailabilityFilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
      {chips.map((chip) => (
        <Button
          key={chip.value}
          type="button"
          variant="outline"
          aria-pressed={chip.value === selected}
          onClick={() => onChange(chip.value)}
          className={cn(
            'h-11 rounded-full border-white/15 px-4 text-[14px] font-bold',
            chip.value === selected ? 'border-white bg-white text-coach-bg hover:bg-white' : 'bg-transparent text-white/70',
          )}
        >
          {chip.label}
        </Button>
      ))}
    </div>
  )
}
