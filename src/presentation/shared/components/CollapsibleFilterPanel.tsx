import type { ReactNode } from 'react'
import { IconChevronDown, IconFilter } from '@tabler/icons-react'
import { cn } from '../lib/utils'

interface CollapsibleFilterPanelProps {
  isExpanded: boolean
  onToggle: () => void
  // Shown on the header row while collapsed ("Seniors · Équipe A · Disponibles"),
  // so a hidden filter is never a mystery.
  summary: string
  // The filter lines, one per child, rendered only while expanded.
  children: ReactNode
}

// One dedicated, collapsible space for a screen's filters. The header row is
// always visible and is the toggle; each filter then sits on its own line
// (the caller's children). Shared by the availability and leaderboard screens.
export function CollapsibleFilterPanel({ isExpanded, onToggle, summary, children }: CollapsibleFilterPanelProps) {
  return (
    <section aria-label="Filtres" className="rounded-2xl border border-white/10 bg-white/4">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex h-11 w-full items-center gap-2 rounded-2xl px-3.5 text-left"
      >
        <IconFilter className="size-4.5 shrink-0 text-white/70" aria-hidden />
        <span className="text-[14px] font-bold text-white">Filtres</span>
        {!isExpanded && summary && (
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-coach-green-text">{summary}</span>
        )}
        <IconChevronDown
          className={cn('ml-auto size-4.5 shrink-0 text-white/60 transition-transform', isExpanded && 'rotate-180')}
          aria-hidden
        />
      </button>

      {isExpanded && <div className="flex flex-col gap-3.5 px-3.5 pb-3.5">{children}</div>}
    </section>
  )
}
