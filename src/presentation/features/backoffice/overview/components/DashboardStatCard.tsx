import { Link } from 'react-router-dom'
import type { DashboardStatCard as DashboardStatCardData } from '../useBackofficeOverviewViewModel'
import { Skeleton } from '@presentation/shared/components/ui/skeleton'

interface DashboardStatCardProps {
  card: DashboardStatCardData
}

// specs/web-dashboard.md UI design §3 "Rangée de compteurs" — a real router
// Link (AC-WD-24: keyboard focus, middle-click, new-tab all work — never an
// onClick+navigate() on a div), destination already resolved by the
// ViewModel from BACKOFFICE_NAV_ITEMS (AC-WD-08). Three states, each
// branched on a boolean the ViewModel already computed (CLAUDE.md §6):
// loading (animated placeholder, never a flash of "0"), error (a muted dash
// with the translated message as its accessible name, the card stays a
// live link to its own destination — AC-WD-28), value (0 included, a real
// number, never treated as "empty").
export function DashboardStatCard({ card }: DashboardStatCardProps) {
  return (
    <Link
      to={card.to}
      className="flex min-h-11 flex-col gap-1 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{card.label}</span>

      {card.isLoading && <Skeleton className="h-8 w-16" />}

      {!card.isLoading && card.errorMessage && (
        <span className="text-3xl font-extrabold text-muted-foreground" title={card.errorMessage} aria-label={card.errorMessage}>
          —
        </span>
      )}

      {!card.isLoading && !card.errorMessage && <span className="text-3xl font-extrabold text-foreground">{card.value}</span>}

      <span className="text-sm text-muted-foreground">{card.subline}</span>
    </Link>
  )
}
