import { IconFilter } from '@tabler/icons-react'

interface BackofficeFiltersToggleProps {
  isCollapsed: boolean
  hasActiveFilters: boolean
  onToggle: () => void
}

// Icon button collapsing/expanding a screen's filter bar. The dot shows that
// filters are still applied while the bar is hidden, so a short list is never
// a mystery.
export function BackofficeFiltersToggle({ isCollapsed, hasActiveFilters, onToggle }: BackofficeFiltersToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isCollapsed ? 'Afficher les filtres' : 'Masquer les filtres'}
      aria-expanded={!isCollapsed}
      className="relative flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
    >
      <IconFilter className="size-5" aria-hidden />
      {isCollapsed && hasActiveFilters && (
        <span className="absolute top-2 right-2 size-2 rounded-full bg-coach-green" aria-hidden />
      )}
    </button>
  )
}
