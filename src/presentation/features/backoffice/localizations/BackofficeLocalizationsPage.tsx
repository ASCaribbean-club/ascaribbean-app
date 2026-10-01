import { IconPlus } from '@tabler/icons-react'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'
import { BackofficeEmptyState } from '@presentation/features/backoffice/components/BackofficeEmptyState'
import { ArchiveTrainingLocationDialog } from './components/ArchiveTrainingLocationDialog'
import { TrainingLocationFormDialog } from './components/TrainingLocationFormDialog'
import { TrainingLocationTable } from './components/TrainingLocationTable'
import { TrainingLocationTableSkeleton } from './components/TrainingLocationTableSkeleton'
import { useBackofficeLocalizationsViewModel } from './useBackofficeLocalizationsViewModel'

const navItem = BACKOFFICE_NAV_ITEMS.find((item) => item.id === 'locations')!

// specs/web-localizations.md UI design "Écran backoffice — liste". Zero
// business logic (CLAUDE.md §4/§6): every `if` below branches on a boolean
// the ViewModel already computed (isLoading / error / rows.length /
// canWrite).
export function BackofficeLocalizationsPage() {
  const vm = useBackofficeLocalizationsViewModel()

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-foreground">Lieux d’entraînement</h2>
          <p className="text-sm text-muted-foreground">
            Informations constantes réutilisées lors de la planification des entraînements.
          </p>
        </div>
        {/* Rendered only if canWrite, never grayed out. Stays visible in the
            empty-list state: it's the only way to enter the first location.
            Solid green like the other page-level add buttons (seasons,
            news) and the mockup. */}
        {vm.canWrite && (
          <Button
            type="button"
            onClick={vm.openCreateDialog}
            className="h-11 shrink-0 rounded-full bg-coach-green px-4 font-bold text-white hover:bg-coach-green"
          >
            <IconPlus className="size-4" aria-hidden />
            Nouveau lieu
          </Button>
        )}
      </div>

      {vm.isLoading && <TrainingLocationTableSkeleton />}

      {!vm.isLoading && vm.error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{vm.error.message}</AlertDescription>
        </Alert>
      )}

      {!vm.isLoading && !vm.error && vm.rows.length === 0 && (
        <BackofficeEmptyState icon={navItem.icon} title={navItem.emptyStateTitle} />
      )}

      {!vm.isLoading && !vm.error && vm.rows.length > 0 && (
        <TrainingLocationTable
          rows={vm.rows}
          canWrite={vm.canWrite}
          onEdit={vm.openEditDialog}
          onArchive={vm.requestArchive}
        />
      )}

      <TrainingLocationFormDialog dialog={vm.dialog} onClose={vm.closeDialog} />
      <ArchiveTrainingLocationDialog
        trainingLocation={vm.pendingArchive}
        isArchiving={vm.isArchiving}
        errorMessage={vm.archiveErrorMessage}
        onConfirm={vm.confirmArchive}
        onCancel={vm.cancelArchive}
      />
    </div>
  )
}
