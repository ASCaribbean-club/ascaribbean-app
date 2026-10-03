import { useState } from 'react'
import { IconFilter } from '@tabler/icons-react'
import type { Section } from '@domain/entities/section'
import { Button } from '@presentation/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@presentation/shared/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@presentation/shared/components/ui/radio-group'

interface CalendarSectionFilterProps {
  sections: Section[]
  selectedSectionId: string | null
  // Already composed by the ViewModel, e.g. "Filtrer par section, E-Sport actif".
  ariaLabel: string
  onSelect: (sectionId: string | null) => void
}

const ALL_VALUE = 'all'

// Dirigeant-only filter (specs/mobile-dirigeant-habilite.md §1.2 / UI design
// §2): a Popover anchored to a round filter icon, holding a RadioGroup.
// A choice closes the popover and applies immediately (no "Apply" button).
// The green dot on the icon is doubled by the aria-label and by the
// "Section : X" chip rendered under the header — never colour alone.
export function CalendarSectionFilter({ sections, selectedSectionId, ariaLabel, onSelect }: CalendarSectionFilterProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={ariaLabel}
          className="relative size-11 shrink-0 rounded-full bg-white/8 text-white hover:bg-white/15"
        >
          <IconFilter className="size-5" aria-hidden />
          {selectedSectionId && (
            <span aria-hidden className="absolute top-2 right-2 size-2.5 rounded-full border-2 border-coach-bg bg-coach-green" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 gap-0 border-white/12 bg-coach-bg p-1.5 text-white">
        <RadioGroup
          aria-label="Filtrer par section"
          value={selectedSectionId ?? ALL_VALUE}
          onValueChange={(value) => {
            onSelect(value === ALL_VALUE ? null : value)
            setOpen(false)
          }}
          className="gap-0"
        >
          {[{ id: ALL_VALUE, name: 'Toutes' }, ...sections].map((option) => (
            <label key={option.id} className="flex h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-[14px] font-semibold hover:bg-white/10">
              <span className="min-w-0 truncate">{option.name}</span>
              <RadioGroupItem value={option.id} className="border-white/40 text-coach-green-text" />
            </label>
          ))}
        </RadioGroup>
      </PopoverContent>
    </Popover>
  )
}
