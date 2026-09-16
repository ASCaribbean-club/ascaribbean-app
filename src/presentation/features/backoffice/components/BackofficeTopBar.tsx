import { IconBell, IconSearch } from '@tabler/icons-react'
import { Avatar, AvatarFallback } from '@presentation/shared/components/ui/avatar'
import { Input } from '@presentation/shared/components/ui/input'
import { formatRole } from '@presentation/shared/formatters/role-labels'
import { BackofficeBrandMark } from '@presentation/features/backoffice/components/BackofficeBrandMark'

interface BackofficeTopBarProps {
  fullName: string
  initials: string
}

// `[Admin] Web - Dashboard-2.png`. sticky top-0 + an opaque bg
// (bg-background, not transparent) — same "back navigation stays reachable
// while scrolling" rule CLAUDE.md §6 documents for the mobile BackHeader,
// applied here even though there's no back arrow: the point is that the
// page body must never be able to scroll this bar off-screen, which starts
// mattering the moment a real screen replaces BackofficeEmptyState.
export function BackofficeTopBar({ fullName, initials }: BackofficeTopBarProps) {
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-stretch bg-background">
      {/* Left cell matches BackofficeSidebar's own w-64 exactly, so the
          border-r here lines up with the sidebar's border-r right below it
          — one continuous vertical divider from the top bar down through
          the nav column, not two independent borders that happen to align.
          No border-b under this cell: the logo flows straight into the nav
          column below it, same as the sidebar's own top edge. */}
      <div className="flex w-64 shrink-0 items-center border-r border-border px-6">
        <BackofficeBrandMark variant="inline" />
      </div>

      <div className="flex flex-1 items-center gap-4 border-b border-border px-6">
        {/* AC-WE-15: present but inert — `disabled`, no onChange, no query
            possible. Kept in the layout rather than omitted, per the spec's
            own reasoning: an inert field communicates "search is coming"
            better than a gap in the bar would. */}
        <div className="relative w-full max-w-sm">
          <IconSearch
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            disabled
            placeholder="Rechercher un utilisateur, une équipe…"
            // h-11 (44px, CLAUDE.md §6), not shadcn's un-adjusted h-8 default.
            className="h-11 rounded-full pl-9"
            aria-label="Recherche (indisponible pour l’instant)"
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Inert, and deliberately without the mockup's red unread-count
              dot: an unread count is invented data with no notification
              system behind it in this tranche — same reasoning AC-WE-13
              applies to the counter cards, extended here to a non-numeric
              indicator. */}
          <button
            type="button"
            aria-label="Notifications (aucune action pour l’instant)"
            disabled
            className="flex size-11 items-center justify-center rounded-full text-muted-foreground disabled:opacity-60"
          >
            <IconBell className="size-5" aria-hidden />
          </button>

          <div className="flex items-center gap-2.5">
            {/* Initials/name come from props (the signed-in User), never
                hard-coded — AC-WE-14 explicitly forbids reproducing the
                mockup's own name ("Sophie Dorval"), including as a fixture. */}
            <Avatar className="size-9 border border-border">
              <AvatarFallback className="bg-coach-green text-xs font-semibold text-white">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden flex-col leading-tight sm:flex">
              <span className="text-sm font-semibold text-foreground">{fullName}</span>
              <span className="text-xs text-muted-foreground">{formatRole('admin')}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
