import { NavLink } from 'react-router-dom'
import { IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand } from '@tabler/icons-react'
import { cn } from '@presentation/shared/lib/utils'
import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'
import { useMembershipsNavBadge } from '@presentation/features/backoffice/memberships/useMembershipsNavBadge'
import { useUsersNavBadge } from '@presentation/features/backoffice/users/useUsersNavBadge'
import { BackofficeBrandMark } from './BackofficeBrandMark'
import { BackofficeLogoutButton } from './BackofficeLogoutButton'
import { MembershipsAndInvitationsAlert } from './MembershipsAndInvitationsAlert'
import { MissingRoleAlert } from './MissingRoleAlert'
import { SidebarTooltip } from './SidebarTooltip'

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
//
// Fixed-height column (the layout pins it to the viewport): brand header and
// logout stay put, only the middle region (nav entries + alerts) scrolls when
// it doesn't fit — small laptop screens.
interface BackofficeSidebarProps {
  fullName: string
  isCollapsed: boolean
  onToggle: () => void
}

// `isCollapsed`: icon-only rail (w-20) — labels move to a tooltip, badges
// become counts pinned on the icon, alerts shrink to an icon with a count.
export function BackofficeSidebar({ fullName, isCollapsed, onToggle }: BackofficeSidebarProps) {
  return (
    <nav
      aria-label="Navigation du backoffice"
      className={cn('flex h-full shrink-0 flex-col border-r border-border', isCollapsed ? 'w-20' : 'w-64')}
    >
      <div className={cn('shrink-0 py-4', isCollapsed ? 'flex justify-center' : 'px-6')}>
        <BackofficeBrandMark variant={isCollapsed ? 'icon' : 'inline'} caption={fullName} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 no-scrollbar py-2">
        <ul className="flex flex-col gap-1">
          {BACKOFFICE_NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <SidebarTooltip enabled={isCollapsed} label={item.label}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      // min-h-11 (44px, CLAUDE.md §6 touch-target rule) and the
                      // whole row is the link — not just the label — so the
                      // clickable area is the full width of the sidebar, not a
                      // narrow text hitbox.
                      'relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                      isCollapsed && 'justify-center',
                      isActive && 'bg-muted text-foreground',
                    )
                  }
                >
                  <item.icon className="size-4.5 shrink-0" aria-hidden />
                  {isCollapsed ? <span className="sr-only">{item.label}</span> : item.label}
                  {item.id === 'memberships' && <MembershipsNavBadge isCollapsed={isCollapsed} />}
                  {item.id === 'users' && <UsersNavBadge isCollapsed={isCollapsed} />}
                </NavLink>
              </SidebarTooltip>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex flex-col gap-3">
          <MembershipsAndInvitationsAlert isCollapsed={isCollapsed} />
          <MissingRoleAlert isCollapsed={isCollapsed} />
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-3 px-3 py-4">
        <BackofficeLogoutButton isCollapsed={isCollapsed} />
        <SidebarTooltip enabled={isCollapsed} label="Agrandir le menu">
          <button
            type="button"
            onClick={onToggle}
            aria-label={isCollapsed ? 'Agrandir le menu' : 'Réduire le menu'}
            aria-expanded={!isCollapsed}
            className={cn(
              'flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              isCollapsed ? 'size-11 self-center justify-center p-0' : 'w-full',
            )}
          >
            {isCollapsed ? (
              <IconLayoutSidebarLeftExpand className="size-4.5 shrink-0" aria-hidden />
            ) : (
              <>
                <IconLayoutSidebarLeftCollapse className="size-4.5 shrink-0" aria-hidden />
                Réduire le menu
              </>
            )}
          </button>
        </SidebarTooltip>
      </div>
    </nav>
  )
}

// specs/web-memberships.md §2.8/UI design "Badge de navigation" — split into
// its own component (rather than inlined in the loop above) so its query
// only ever runs once, for the single nav item that needs it — every other
// BackofficeNavItem never triggers this hook.
function MembershipsNavBadge({ isCollapsed }: { isCollapsed: boolean }) {
  const { count } = useMembershipsNavBadge()
  if (count <= 0) return null

  return (
    <span
      className={cn(
        'flex h-5 min-w-5 items-center justify-center rounded-full bg-coach-red px-1.5 text-[11px] font-bold text-white',
        isCollapsed ? 'absolute -top-1 -right-1' : 'ml-auto',
      )}
    >
      {count}
    </span>
  )
}

// specs/web-users.md §2.8/UI design "Badge de navigation" — twin of
// MembershipsNavBadge above, copied not generalized into a `badge` field on
// BackofficeNavItem (§2.8's own instruction, backoffice-nav.ts's own comment
// on why that field doesn't exist). Its own isolated child component so its
// query only ever runs for THIS nav item.
function UsersNavBadge({ isCollapsed }: { isCollapsed: boolean }) {
  const { count } = useUsersNavBadge()
  if (count <= 0) return null

  return (
    <span
      className={cn(
        'flex h-5 min-w-5 items-center justify-center rounded-full bg-coach-red px-1.5 text-[11px] font-bold text-white',
        isCollapsed ? 'absolute -top-1 -right-1' : 'ml-auto',
      )}
    >
      {count}
    </span>
  )
}
