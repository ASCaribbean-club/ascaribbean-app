import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'
import { BackofficeEmptyState } from '@presentation/features/backoffice/components/BackofficeEmptyState'

const navItem = BACKOFFICE_NAV_ITEMS.find((item) => item.id === 'users')!

// AC-WE-11/AC-WE-12: this screen IS its own empty state, nothing else — no
// query, no repository, no use case. specs/web-empty-state.md §1 is
// explicit that this tranche only builds the door and the shell, not a
// users console — see that spec's "Ce que cette tranche débloque,
// accessoirement" for what a real Utilisateurs screen would need later.
export function BackofficeUsersPage() {
  return <BackofficeEmptyState icon={navItem.icon} title={navItem.emptyStateTitle} />
}
