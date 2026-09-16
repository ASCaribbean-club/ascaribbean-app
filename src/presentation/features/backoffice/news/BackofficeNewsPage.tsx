import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'
import { BackofficeEmptyState } from '@presentation/features/backoffice/components/BackofficeEmptyState'

const navItem = BACKOFFICE_NAV_ITEMS.find((item) => item.id === 'news')!

// AC-WE-11/AC-WE-12 — see BackofficeUsersPage.tsx for the full reasoning,
// identical here: an empty state, no query, no use case.
//
// specs/web-empty-state.md §1 ("Hors périmètre"): this is NOT a club_news
// authoring console — PO-AT-01 (specs/actus.md) leaves write rights on
// club_news undefined, so nothing beyond this empty state belongs here yet.
export function BackofficeNewsPage() {
  return <BackofficeEmptyState icon={navItem.icon} title={navItem.emptyStateTitle} />
}
