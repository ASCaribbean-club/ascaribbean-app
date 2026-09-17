import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'
import { BackofficeEmptyState } from '@presentation/features/backoffice/components/BackofficeEmptyState'
import { BackofficePageHeader } from '@presentation/features/backoffice/components/BackofficePageHeader'
import { useBackofficeDashboardViewModel } from '@presentation/features/backoffice/dashboard/useBackofficeDashboardViewModel'

const navItem = BACKOFFICE_NAV_ITEMS.find((item) => item.id === 'overview')!

// 2026-09-17 developer decision: `/admin` index route, the only screen
// carrying the "Bonjour, {prénom}" greeting header — see backoffice-nav.ts
// and BackofficeDashboardLayout.tsx for why it moved here instead of
// staying shared chrome. Same "Page has zero business logic, ViewModel
// already computed the booleans/strings" shape as every other screen —
// firstName comes straight from the same ViewModel the layout itself uses.
export function BackofficeOverviewPage() {
  const vm = useBackofficeDashboardViewModel()

  return (
    <>
      <BackofficePageHeader firstName={vm.firstName} />
      <BackofficeEmptyState icon={navItem.icon} title={navItem.emptyStateTitle} />
    </>
  )
}
