import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'
import { BackofficeEmptyState } from '@presentation/features/backoffice/components/BackofficeEmptyState'

const navItem = BACKOFFICE_NAV_ITEMS.find((item) => item.id === 'seasons')!

// AC-WE-11/AC-WE-12 — see BackofficeUsersPage.tsx for the full reasoning,
// identical here: an empty state, no query, no use case.
//
// PO-WE-10 (specs/web-empty-state.md §5): "Saisons" doesn't correspond to
// any specified screen yet — not this tranche's concern, flagged here only
// so it isn't mistaken for an oversight when this file is next touched.
export function BackofficeSeasonsPage() {
  return <BackofficeEmptyState icon={navItem.icon} title={navItem.emptyStateTitle} />
}
