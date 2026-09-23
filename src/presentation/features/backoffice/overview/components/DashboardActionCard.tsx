import type { Icon } from '@tabler/icons-react'
import { cn } from '@presentation/shared/lib/utils'

interface DashboardActionCardProps {
  icon: Icon
  title: string
  description: string
  onClick: () => void
  // UI design §2 "Rangée d'actions" — only the FIRST tile ("Inviter un
  // utilisateur") carries the filled, colored treatment (reprise du
  // traitement de l'ancien bouton `disabled` de BackofficePageHeader); the
  // other three are neutral outline tiles — same hierarchy as the mockup,
  // which colors only its own first tile.
  variant?: 'primary' | 'outline'
}

// specs/web-dashboard.md UI design §2 — a real `button` (never a `div` with
// an onClick, same reasoning as the Link requirement on DashboardStatCard),
// `h-11` minimum (CLAUDE.md §6 — a real touch target even on this
// desktop-only screen, same call already made for UserMissingElementIndicator).
// Visibility is entirely the CALLER's concern (AC-WD-11 — a tile whose
// permission is false is simply not rendered, never grayed out): this
// component has no permission awareness of its own.
export function DashboardActionCard({ icon: TileIcon, title, description, onClick, variant = 'outline' }: DashboardActionCardProps) {
  const isPrimary = variant === 'primary'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-11 flex-1 items-center gap-3 rounded-xl px-4 py-3 text-left ring-1 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        isPrimary ? 'bg-coach-green text-white ring-coach-green hover:bg-coach-green/90' : 'bg-card ring-foreground/10 hover:bg-muted',
      )}
    >
      <span
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-lg',
          isPrimary ? 'bg-white/15 text-white' : 'bg-muted text-foreground',
        )}
      >
        <TileIcon className="size-5" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className={cn('truncate text-sm font-bold', isPrimary ? 'text-white' : 'text-foreground')}>{title}</span>
        <span className={cn('truncate text-xs', isPrimary ? 'text-white/80' : 'text-muted-foreground')}>{description}</span>
      </span>
    </button>
  )
}
