import { NavLink } from 'react-router-dom'
import { cn } from '@presentation/shared/lib/utils'
import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'
import { useMembershipsNavBadge } from '@presentation/features/backoffice/memberships/useMembershipsNavBadge'
import { useUsersNavBadge } from '@presentation/features/backoffice/users/useUsersNavBadge'
import { BackofficeLogoutButton } from './BackofficeLogoutButton'
import { MembershipsAndInvitationsAlert } from './MembershipsAndInvitationsAlert'
import { MissingRoleAlert } from './MissingRoleAlert'

// Vertical nav, 7 fixed entries (specs/web-empty-state.md, "Navigation
// latérale (Dashboard-3), 5 entrées", grown since by web-seasons/
// web-memberships/web-actus). `NavLink` (not a plain <a>/<button> with
// manually-tracked state) so "active" comes from the router matching the
// current path — same reason the mobile BottomNav
// (presentation/shared/layout/BottomNav.tsx) uses it instead of hand-rolled
// state.
//
// specs/web-memberships.md §2.8 — resolves AC-WE-13/PO-WE-11 PARTIALLY, for
// the "Adhésions" entry (MembershipsNavBadge below). specs/web-users.md
// §2.8/AC-WU-16 — closes PO-WE-11 for the SECOND and LAST numeric badge,
// "Utilisateurs" (UsersNavBadge below), on the four-criteria completeness
// predicate (§2.3).
//
// specs/web-dashboard.md §2.5/§2.6 — closes PO-WE-11's LAST reliquat: the
// two ALERTE blocks (MembershipsAndInvitationsAlert/MissingRoleAlert below)
// and the logout button (BackofficeLogoutButton), all in the FOOTER of this
// same shared chrome — visible on all 7 destinations, not just
// /admin/overview (§2.5's own "chrome partagé, pas la page"). Each is its
// own isolated component so its query only ever runs for itself, same
// reasoning as the two nav badges above.
export function BackofficeSidebar() {
  return (
    <nav aria-label="Navigation du backoffice" className="flex w-64 shrink-0 flex-col border-r border-border px-3 py-6">
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
              {item.id === 'memberships' && <MembershipsNavBadge />}
              {item.id === 'users' && <UsersNavBadge />}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* CLAUDE.md §6 — same `sticky bottom-0` + opaque background pattern
          already used for anchored submit bars: the sidebar's own <ul> can
          in principle grow past the viewport (a future 8th destination), so
          this footer is pinned to the visible bottom of the column rather
          than merely trailing after it in normal flow. */}
      <div className="sticky bottom-0 mt-auto flex flex-col gap-3 bg-background pt-6">
        <MembershipsAndInvitationsAlert />
        <MissingRoleAlert />
        <BackofficeLogoutButton />
      </div>
    </nav>
  )
}

// specs/web-memberships.md §2.8/UI design "Badge de navigation" — split into
// its own component (rather than inlined in the loop above) so its query
// only ever runs once, for the single nav item that needs it — every other
// BackofficeNavItem never triggers this hook.
function MembershipsNavBadge() {
  const { count } = useMembershipsNavBadge()
  if (count <= 0) return null

  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-coach-red px-1.5 text-[11px] font-bold text-white">
      {count}
    </span>
  )
}

// specs/web-users.md §2.8/UI design "Badge de navigation" — twin of
// MembershipsNavBadge above, copied not generalized into a `badge` field on
// BackofficeNavItem (§2.8's own instruction, backoffice-nav.ts's own comment
// on why that field doesn't exist). Its own isolated child component so its
// query only ever runs for THIS nav item.
function UsersNavBadge() {
  const { count } = useUsersNavBadge()
  if (count <= 0) return null

  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-coach-red px-1.5 text-[11px] font-bold text-white">
      {count}
    </span>
  )
}

