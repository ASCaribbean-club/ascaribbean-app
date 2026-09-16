import { IconCalendarStats, IconCreditCard, IconNews, IconUsers, IconUsersGroup, type Icon } from '@tabler/icons-react'

export type BackofficeNavItemId = 'users' | 'sections' | 'seasons' | 'memberships' | 'news'

export interface BackofficeNavItem {
  id: BackofficeNavItemId
  label: string
  path: string
  icon: Icon
  emptyStateTitle: string
}

// The 5 sidebar destinations (specs/web-empty-state.md, "Navigation
// latérale (Dashboard-3), 5 entrées") — centralized once so
// BackofficeSidebar (renders the links) and each of the 5 screens (need the
// same icon/label to describe their own empty state, per the spec's "un
// seul composant, paramétré... pas 5 composants dupliqués") don't duplicate
// this list. Not a queryKey, but the same "decide the shape once, reuse
// everywhere" reasoning as presentation/shared/query-keys.ts.
//
// `id` exists purely so a screen can look up its own entry
// (`BACKOFFICE_NAV_ITEMS.find((item) => item.id === 'users')`) instead of a
// fragile array index that would silently break if this list gets reordered.
//
// Deliberately missing vs. the mockup: no numeric badge count field on
// 'users'/'memberships' — a count is invented data until PO-WE-11 says what
// it counts (AC-WE-13, specs/web-empty-state.md §5).
export const BACKOFFICE_NAV_ITEMS: BackofficeNavItem[] = [
  {
    id: 'users',
    label: 'Utilisateurs',
    path: '/admin/users',
    icon: IconUsers,
    emptyStateTitle: 'Aucun utilisateur à afficher pour l’instant',
  },
  {
    id: 'sections',
    label: 'Sections & Équipes',
    path: '/admin/sections',
    icon: IconUsersGroup,
    emptyStateTitle: 'Aucune section ni équipe à afficher pour l’instant',
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
