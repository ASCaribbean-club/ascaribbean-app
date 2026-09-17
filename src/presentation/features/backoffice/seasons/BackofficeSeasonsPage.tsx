import { IconPlus } from '@tabler/icons-react'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'
import { BackofficeEmptyState } from '@presentation/features/backoffice/components/BackofficeEmptyState'
import { SeasonFormDialog } from './components/SeasonFormDialog'
import { SeasonTable } from './components/SeasonTable'
import { SeasonTableSkeleton } from './components/SeasonTableSkeleton'
import { useBackofficeSeasonsViewModel } from './useBackofficeSeasonsViewModel'

const navItem = BACKOFFICE_NAV_ITEMS.find((item) => item.id === 'seasons')!

// specs/web-seasons.md — replaces the BackofficeEmptyState stub (whose
// comment cited PO-WE-10 as the reason not to build this yet): /admin/seasons
// is now the seasons write console (AC-WS-01 through AC-WS-32), and this
// answers PO-WE-10 for the "Saisons" nav entry (§1 of that spec). Zero
// business logic here (CLAUDE.md §4/§6): every `if` below branches on a
// boolean the ViewModel already computed (isLoading / error / rows.length /
// canWrite).
export function BackofficeSeasonsPage() {
  const vm = useBackofficeSeasonsViewModel()

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-foreground">Saisons</h2>
        {/* AC-WS-19 — rendered only if canWrite, never grayed out: "une
            carte disparaît, elle n'apparaît pas désactivée". Stays visible
            even in the empty-list state below — it's the only way an admin
            can create the club's very first season. */}
        {vm.canWrite && (
          <Button
            type="button"
            onClick={vm.openCreateDialog}
            className="h-11 rounded-full bg-coach-green px-4 font-bold text-white hover:bg-coach-green"
          >
            <IconPlus className="size-4" aria-hidden />
            Nouvelle saison
          </Button>
        )}
      </div>

      {vm.isLoading && <SeasonTableSkeleton />}

      {!vm.isLoading && vm.error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{vm.error.message}</AlertDescription>
        </Alert>
      )}

      {!vm.isLoading && !vm.error && vm.rows.length === 0 && (
        <BackofficeEmptyState icon={navItem.icon} title={navItem.emptyStateTitle} />
      )}

      {!vm.isLoading && !vm.error && vm.rows.length > 0 && (
        <SeasonTable rows={vm.rows} canWrite={vm.canWrite} onEdit={vm.openEditDialog} />
      )}

      <SeasonFormDialog dialog={vm.dialog} onClose={vm.closeDialog} />
    </div>
  )
}
