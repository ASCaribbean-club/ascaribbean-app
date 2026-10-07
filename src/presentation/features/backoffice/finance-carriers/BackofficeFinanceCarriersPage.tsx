import { IconPlus } from '@tabler/icons-react'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'
import { BackofficeEmptyState } from '@presentation/features/backoffice/components/BackofficeEmptyState'
import { ArchiveFinanceCarrierDialog } from './components/ArchiveFinanceCarrierDialog'
import { FinanceCarrierFormDialog } from './components/FinanceCarrierFormDialog'
import { FinanceCarrierTable } from './components/FinanceCarrierTable'
import { FinanceCarrierTableSkeleton } from './components/FinanceCarrierTableSkeleton'
import { useBackofficeFinanceCarriersViewModel } from './useBackofficeFinanceCarriersViewModel'

const navItem = BACKOFFICE_NAV_ITEMS.find((item) => item.id === 'finance-carriers')!

// specs/web-finance-carriers.md UI design "États de la page". Zero business
// logic (CLAUDE.md §4/§6): every `if` branches on a boolean the ViewModel
// already computed. No delete control anywhere (AC-FC-10); "Archiver" /
// "Restaurer" only with canArchive (specs/finances-member-advances.md AC-FA-19).
export function BackofficeFinanceCarriersPage() {
  const vm = useBackofficeFinanceCarriersViewModel()

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-foreground">Porteurs de fonds</h2>
          <p className="text-sm text-muted-foreground">
            Comptes bancaires et caisses sur lesquels sont enregistrées les dépenses et les cotisations.
          </p>
          <p className="text-sm text-muted-foreground">Un porteur archivé n’est plus proposé pour les nouvelles saisies.</p>
        </div>
        {/* Rendered only if canCreate, never grayed out. Stays visible in the
            empty-list state: it's the only way to enter the first carrier. */}
        {vm.canCreate && (
          <Button
            type="button"
            onClick={vm.openCreateDialog}
            className="h-11 shrink-0 rounded-full bg-coach-green px-4 font-bold text-white hover:bg-coach-green"
          >
            <IconPlus className="size-4" aria-hidden />
            Nouveau porteur
          </Button>
        )}
      </div>

      {vm.isLoading && <FinanceCarrierTableSkeleton />}

      {!vm.isLoading && vm.error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{vm.error.message}</AlertDescription>
        </Alert>
      )}

      {!vm.isLoading && !vm.error && vm.rows.length === 0 && (
        <BackofficeEmptyState
          icon={navItem.icon}
          title={navItem.emptyStateTitle}
          description="Ajoutez les comptes bancaires et les caisses du club pour que le Trésorier puisse saisir les dépenses et les soldes."
        />
      )}

      {vm.restoreErrorMessage && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{vm.restoreErrorMessage}</AlertDescription>
        </Alert>
      )}

      {!vm.isLoading && !vm.error && vm.rows.length > 0 && (
        <FinanceCarrierTable
          rows={vm.rows}
          canUpdate={vm.canUpdate}
          canArchive={vm.canArchive}
          onEdit={vm.openEditDialog}
          onArchive={vm.requestArchive}
          onRestore={vm.restore}
          restoringCarrierId={vm.restoringCarrierId}
        />
      )}

      <FinanceCarrierFormDialog dialog={vm.dialog} onClose={vm.closeDialog} />
      <ArchiveFinanceCarrierDialog
        carrier={vm.pendingArchive}
        isArchiving={vm.isArchiving}
        errorMessage={vm.archiveErrorMessage}
        onConfirm={vm.confirmArchive}
        onCancel={vm.cancelArchive}
      />
    </div>
  )
}
