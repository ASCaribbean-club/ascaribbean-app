import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'
import { BackofficeEmptyState } from '@presentation/features/backoffice/components/BackofficeEmptyState'

const navItem = BACKOFFICE_NAV_ITEMS.find((item) => item.id === 'sections')!

// AC-WE-11/AC-WE-12 — see BackofficeUsersPage.tsx for the full reasoning,
// identical here: an empty state, no query, no use case.
export function BackofficeSectionsPage() {
  return <BackofficeEmptyState icon={navItem.icon} title={navItem.emptyStateTitle} />
}
