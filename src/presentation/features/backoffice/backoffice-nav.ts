import {
  IconBuildingBank,
  IconCalendarEvent,
  IconCalendarStats,
  IconChecklist,
  IconCreditCard,
  IconHistory,
  IconLayoutDashboard,
  IconMapPin,
  IconNews,
  IconShirtSport,
  IconUsers,
  IconUsersGroup,
  type Icon,
} from '@tabler/icons-react'

export type BackofficeNavItemId = 'overview' | 'users' | 'sections' | 'teams' | 'seasons' | 'memberships' | 'finance-carriers' | 'news' | 'convocations' | 'mission-templates' | 'locations' | 'audit'

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
    id: 'memberships',
    label: 'Adhésions',
    path: '/admin/memberships',
    icon: IconCreditCard,
    emptyStateTitle: 'Aucune adhésion à afficher pour l’instant',
  },
  {
    // specs/web-finance-carriers.md UI design "Où ça vit" (PO-FC-07/UI-FC-01
    // defaults) — "Porteurs", right after 'memberships', no other entry
    // reordered, same guards, no numeric badge (AC-FC-08). `IconBuildingBank`
    // is a replaceable proposal.
    id: 'finance-carriers',
    label: 'Porteurs',
    path: '/admin/finance-carriers',
    icon: IconBuildingBank,
    emptyStateTitle: 'Aucun porteur à afficher pour l’instant',
  },
  {
    id: 'teams',
    label: 'Équipes',
    path: '/admin/teams',
    icon: IconShirtSport,
    emptyStateTitle: 'Aucune équipe à afficher pour l’instant',
  },
  {
    // specs/section-and-teams.md §1 "Note de cadrage"/UI design "Décision de
    // routage" — split into two destinations rather than tabs on one page,
    // following the Assign-coach mockup's own sidebar (two separate
    // entries, "Équipes" selected) and this backoffice's existing
    // convention (one nav entry = one resource = one page, no tabs.tsx used
    // anywhere else here). Label/emptyStateTitle narrowed from "Sections &
    // Équipes" now that 'teams' above is its own destination.
    id: 'sections',
    label: 'Sections',
    path: '/admin/sections',
    icon: IconUsersGroup,
    emptyStateTitle: 'Aucune section à afficher pour l’instant',
  },
  {
    id: 'seasons',
    label: 'Saisons',
    path: '/admin/seasons',
    icon: IconCalendarStats,
    emptyStateTitle: 'Aucune saison à afficher pour l’instant',
  },
  {
    // specs/web-create-convocation.md UI design "Où ça vit" — 9th entry,
    // right before "Actus". Same guards as the others, no numeric badge
    // (UI-WC-08, PO-WC-04 open). `IconCalendarEvent` is a replaceable proposal.
    id: 'convocations',
    label: 'Convocations',
    path: '/admin/convocations',
    icon: IconCalendarEvent,
    emptyStateTitle: 'Aucune convocation à afficher pour l’instant',
  },
  {
    // specs/web-mission-templates.md UI design "Où ça vit" — "Référentiel
    // missions", right after 'convocations' and before 'news' (mockup
    // position). Same guards (AC-MT-12), no badge. `IconChecklist` is a
    // replaceable proposal. The mockup's "Statistiques" entry is NOT added.
    id: 'mission-templates',
    label: 'Référentiel missions',
    path: '/admin/mission-templates',
    icon: IconChecklist,
    emptyStateTitle: 'Aucune mission à afficher pour l’instant',
  },
  {
    id: 'news',
    label: 'Actus',
    path: '/admin/news',
    icon: IconNews,
    emptyStateTitle: 'Aucune actualité à afficher pour l’instant',
  },
  {
    // specs/web-localizations.md UI design "Où ça vit" — "Lieux", placed
    // right after 'news' (mockup position) and before 'audit', no other
    // entry reordered. Same guards as the others (AC-WL-12), no numeric
    // badge. `IconMapPin`: a proposal, replaceable by any icon of this set.
    // The mockup's "Statistiques" entry is deliberately NOT added.
    id: 'locations',
    label: 'Lieux',
    path: '/admin/locations',
    icon: IconMapPin,
    emptyStateTitle: 'Aucun lieu d’entraînement à afficher pour l’instant',
  },
  {
    // specs/web-audit-logs.md §2/UI design "Où ça vit" — 8th sidebar entry,
    // `/admin/audit`. AC-AU-23: same guard as the seven others
    // (RequireDesktopViewport -> RequireBackofficeSession ->
    // RequireBackofficeAccess -> BackofficeDashboardLayout), no new guard,
    // no numeric badge (AC-AU-23, echo of AC-WE-13) — this entry never gets
    // a MembershipsNavBadge/UsersNavBadge-style twin. `IconHistory`: this
    // agent's own proposal (the mockup's "menu" export shows an unreadable
    // plain square icon), any icon already in this icon set is fine — to
    // confirm/replace freely.
    id: 'audit',
    label: 'Journal d’audit',
    path: '/admin/audit',
    icon: IconHistory,
    emptyStateTitle: 'Aucune entrée de journal d’audit à afficher pour l’instant',
  },
]
