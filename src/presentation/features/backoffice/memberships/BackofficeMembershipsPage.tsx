import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'
import { BackofficeEmptyState } from '@presentation/features/backoffice/components/BackofficeEmptyState'

const navItem = BACKOFFICE_NAV_ITEMS.find((item) => item.id === 'memberships')!

// AC-WE-11/AC-WE-12 — see BackofficeUsersPage.tsx for the full reasoning,
// identical here: an empty state, no query, no use case.
//
// PO-WE-10 (specs/web-empty-state.md §5): "Adhésions" doesn't correspond to
// any specified screen yet either, same note as BackofficeSeasonsPage.tsx.
export function BackofficeMembershipsPage() {
  return <BackofficeEmptyState icon={navItem.icon} title={navItem.emptyStateTitle} />
}
