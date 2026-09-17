import { IconPlus } from '@tabler/icons-react'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'
import { BackofficeEmptyState } from '@presentation/features/backoffice/components/BackofficeEmptyState'
import { ArchiveNewsDialog } from './components/ArchiveNewsDialog'
import { NewsFormDialog } from './components/NewsFormDialog'
import { NewsTable } from './components/NewsTable'
import { NewsTableSkeleton } from './components/NewsTableSkeleton'
import { useBackofficeNewsViewModel } from './useBackofficeNewsViewModel'

const navItem = BACKOFFICE_NAV_ITEMS.find((item) => item.id === 'news')!

// specs/web-actus.md — replaces the BackofficeEmptyState stub: /admin/news
// is now the club_news authoring console (AC-WA-01 through AC-WA-27).
// Zero business logic here (CLAUDE.md §4/§6): every `if` below branches on
// a boolean the ViewModel already computed (isLoading / error / rows.length
// / canWrite).
export function BackofficeNewsPage() {
  const vm = useBackofficeNewsViewModel()

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-foreground">Actus</h2>
        {/* AC-WA-16 — rendered only if canWrite, never grayed out: same
            "a card disappears rather than appearing disabled" rule applied
            to this button (specs/web-actus.md §"Ce qui change par rôle"). */}
        {vm.canWrite && (
          <Button
            type="button"
            onClick={vm.openCreateDialog}
            className="h-11 rounded-full bg-coach-green px-4 font-bold text-white hover:bg-coach-green"
          >
            <IconPlus className="size-4" aria-hidden />
            Nouvelle actu
          </Button>
        )}
      </div>

      {vm.isLoading && <NewsTableSkeleton />}

      {!vm.isLoading && vm.error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{vm.error.message}</AlertDescription>
        </Alert>
      )}

      {!vm.isLoading && !vm.error && vm.rows.length === 0 && (
        <BackofficeEmptyState icon={navItem.icon} title={navItem.emptyStateTitle} />
      )}

      {!vm.isLoading && !vm.error && vm.rows.length > 0 && (
        <NewsTable rows={vm.rows} canWrite={vm.canWrite} onEdit={vm.openEditDialog} onDelete={vm.requestArchive} />
      )}

      <NewsFormDialog dialog={vm.dialog} onClose={vm.closeDialog} />

      <ArchiveNewsDialog
        news={vm.pendingArchive}
        isArchiving={vm.isArchiving}
        errorMessage={vm.archiveErrorMessage}
        onConfirm={vm.confirmArchive}
        onCancel={vm.cancelArchive}
      />
    </div>
  )
}
