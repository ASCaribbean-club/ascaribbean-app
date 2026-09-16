import { NavLink } from 'react-router-dom'
import { cn } from '@presentation/shared/lib/utils'
import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'

// Vertical nav, 5 fixed entries (specs/web-empty-state.md, "Navigation
// latérale (Dashboard-3), 5 entrées"). `NavLink` (not a plain <a>/<button>
// with manually-tracked state) so "active" comes from the router matching
// the current path — same reason the mobile BottomNav
// (presentation/shared/layout/BottomNav.tsx) uses it instead of hand-rolled
// state.
//
// Two deliberate omissions vs. `[Admin] Web - Dashboard-3.png`, both
// AC-WE-13/PO-WE-11: no numeric badge on Utilisateurs/Adhésions (a count is
// invented data until PO-WE-11 says what it counts), and no "ALERTE /
// Traiter maintenant" block at the bottom of the column — nothing renders
// in its place, the nav simply ends after the 5th entry, per the spec's own
// "rien à afficher, ni un bloc vide à sa place."
export function BackofficeSidebar() {
  return (
    <nav aria-label="Navigation du backoffice" className="w-64 shrink-0 border-r border-border px-3 py-6">
      <ul className="flex flex-col gap-1">
        {BACKOFFICE_NAV_ITEMS.map((item) => (
          <li key={item.id}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                cn(
                  // min-h-11 (44px, CLAUDE.md §6 touch-target rule) and the
                  // whole row is the link — not just the label — so the
                  // clickable area is the full width of the sidebar, not a
                  // narrow text hitbox.
                  'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                  isActive && 'bg-muted text-foreground'
                )
              }
            >
              <item.icon className="size-4.5 shrink-0" aria-hidden />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
