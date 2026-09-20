import {
  IconCalendarStats,
  IconCreditCard,
  IconLayoutDashboard,
  IconNews,
  IconShirtSport,
  IconUsers,
  IconUsersGroup,
  type Icon,
} from '@tabler/icons-react'

export type BackofficeNavItemId = 'overview' | 'users' | 'sections' | 'teams' | 'seasons' | 'memberships' | 'news'

export interface BackofficeNavItem {
  id: BackofficeNavItemId
  label: string
  path: string
  icon: Icon
  emptyStateTitle: string
}

// The sidebar destinations — originally the 5 of specs/web-empty-state.md
// ("Navigation latérale (Dashboard-3), 5 entrées"), plus 'overview' added
// 2026-09-17 (see its own comment below) — centralized once so
// BackofficeSidebar (renders the links) and each screen (needs the
// same icon/label to describe its own empty state, per the spec's "un
// seul composant, paramétré... pas 5 composants dupliqués") don't duplicate
// this list. Not a queryKey, but the same "decide the shape once, reuse
// everywhere" reasoning as presentation/shared/query-keys.ts.
//
// `id` exists purely so a screen can look up its own entry
// (`BACKOFFICE_NAV_ITEMS.find((item) => item.id === 'users')`) instead of a
// fragile array index that would silently break if this list gets reordered.
//
// Deliberately missing vs. the mockup: no generic numeric `badge` field
// here. 'memberships' (web-memberships) and 'users' (specs/web-users.md
// §2.8, PO-WE-11 now fully resolved for both) each carry a count, but each
// through its OWN dedicated twin (use case + hook + queryKey + isolated
// child component, e.g. MembershipsNavBadge/UsersNavBadge in
// BackofficeSidebar.tsx) — never a shared field on this type, so a count is
// never invented generic UI ahead of a spec that's actually defined what it
// counts (AC-WE-13, specs/web-empty-state.md §5).
export const BACKOFFICE_NAV_ITEMS: BackofficeNavItem[] = [
  {
    // 2026-09-17 developer decision: 6th sidebar entry, first in order —
    // the only nav destination that carries the "Bonjour, {prénom}" greeting
    // header (BackofficePageHeader), previously rendered unconditionally by
    // BackofficeDashboardLayout on every backoffice screen. Moved here so
    // the greeting reads as "the dashboard's own header", not chrome shared
    // by unrelated screens like Actus or Utilisateurs.
    id: 'overview',
    label: 'Vue d’ensemble',
    path: '/admin/overview',
    icon: IconLayoutDashboard,
    emptyStateTitle: 'Aucune vue d’ensemble à afficher pour l’instant',
  },
  {
    id: 'users',
    label: 'Utilisateurs',
    path: '/admin/users',
    icon: IconUsers,
    emptyStateTitle: 'Aucun utilisateur à afficher pour l’instant',
  },
  {
    // specs/section-and-teams.md §1 "Note de cadrage"/UI design "Décision de
    // routage" — split into two destinations rather than tabs on one page,
    // following the Assign-coach mockup's own sidebar (two separate
    // entries, "Équipes" selected) and this backoffice's existing
    // convention (one nav entry = one resource = one page, no tabs.tsx used
    // anywhere else here). Label/emptyStateTitle narrowed from "Sections &
    // Équipes" now that 'teams' below is its own destination.
    id: 'sections',
    label: 'Sections',
    path: '/admin/sections',
    icon: IconUsersGroup,
    emptyStateTitle: 'Aucune section à afficher pour l’instant',
  },
  {
    id: 'teams',
    label: 'Équipes',
    path: '/admin/teams',
    icon: IconShirtSport,
    emptyStateTitle: 'Aucune équipe à afficher pour l’instant',
  },
  {
    id: 'seasons',
    label: 'Saisons',
    path: '/admin/seasons',
    icon: IconCalendarStats,
    emptyStateTitle: 'Aucune saison à afficher pour l’instant',
  },
  {
    id: 'memberships',
    label: 'Adhésions',
    path: '/admin/memberships',
    icon: IconCreditCard,
    emptyStateTitle: 'Aucune adhésion à afficher pour l’instant',
  },
  {
    id: 'news',
    label: 'Actus',
    path: '/admin/news',
    icon: IconNews,
    emptyStateTitle: 'Aucune actualité à afficher pour l’instant',
  },
]
