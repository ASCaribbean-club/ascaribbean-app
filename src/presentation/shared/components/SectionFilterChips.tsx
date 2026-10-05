import { useEffect, useRef } from 'react'
import type { Section } from '@domain/entities/section'
import { FILTER_CHIP_CLASSNAME, FILTER_LABEL_CLASSNAME } from '@presentation/shared/components/filter-chip-styles'
import { Skeleton } from '@presentation/shared/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@presentation/shared/components/ui/toggle-group'

interface SectionFilterChipsProps {
  sections: Pick<Section, 'id' | 'name'>[]
  selectedSectionId: string | null
  isLoading: boolean
  onSelect: (value: string) => void
  // Horizontal bleed of the scrolling row up to its container's edge: the
  // screen gutter by default, the card padding when nested in a card.
  bleedClassName?: string
  // Defaults keep the Dirigeant wording; the Treasurer's filter panel overrides them.
  label?: string
  allLabel?: string
}

// Shared by the Dirigeant dashboard and the team availability screen (moved
// from features/dirigeant-dashboard, ARCHITECTURE.md §13.5).
// "Toutes" + one chip per public.sections row (no hard-coded list, AC-DH-07).
// Horizontal scroll without scrollbar; the row bleeds to the screen edge so
// the last chip is visibly cut (scroll hint). The active chip is brought into
// view on mount since the filter is shared with the calendar (AC-DH-15).
export function SectionFilterChips({ sections, selectedSectionId, isLoading, onSelect, bleedClassName = '-mx-5.5 px-5.5', label = 'Filtrer par section', allLabel = 'Toutes' }: SectionFilterChipsProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    containerRef.current
      ?.querySelector<HTMLElement>('[data-state="on"]')
      ?.scrollIntoView?.({ inline: 'center', block: 'nearest' })
  }, [isLoading])

  return (
    <div className="flex flex-col gap-2">
      <h2 className={FILTER_LABEL_CLASSNAME}>{label}</h2>
      {isLoading ? (
        <div className="flex gap-2" aria-hidden>
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-11 w-24 shrink-0 rounded-full bg-white/10" />
          ))}
        </div>
      ) : (
        <div ref={containerRef} className={`${bleedClassName} overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
          <ToggleGroup
            type="single"
            aria-label={label}
            value={selectedSectionId ?? 'all'}
            onValueChange={onSelect}
            spacing={1.5}
            className="w-max"
          >
            <ToggleGroupItem value="all" className={FILTER_CHIP_CLASSNAME}>
              {allLabel}
            </ToggleGroupItem>
            {sections.map((section) => (
              <ToggleGroupItem key={section.id} value={section.id} className={FILTER_CHIP_CLASSNAME}>
                {section.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}
    </div>
  )
}
