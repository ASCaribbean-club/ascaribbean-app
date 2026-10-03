import { IconCalendar, IconList, IconPlus } from '@tabler/icons-react'
import { Button } from '@presentation/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@presentation/shared/components/ui/dialog'
import { ToggleGroup, ToggleGroupItem } from '@presentation/shared/components/ui/toggle-group'
import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'
import { BackofficeEmptyState } from '@presentation/features/backoffice/components/BackofficeEmptyState'
import { ConvocationCalendar } from './components/ConvocationCalendar'
import { ConvocationDetailsPanel } from './components/ConvocationDetailsPanel'
import { ConvocationFilters } from './components/ConvocationFilters'
import { ConvocationTable } from './components/ConvocationTable'
import { ConvocationTableSkeleton } from './components/ConvocationTableSkeleton'
import { useBackofficeConvocationsViewModel } from './useBackofficeConvocationsViewModel'
import { BackofficeFiltersToggle } from '@presentation/features/backoffice/components/BackofficeFiltersToggle'

const navItem = BACKOFFICE_NAV_ITEMS.find((item) => item.id === 'convocations')!

// specs/web-create-convocation.md UI design "Écran 1" — the 9th backoffice
// destination, `/admin/convocations`. Zero business logic (CLAUDE.md §4/§6):
// every branch below reads a boolean the ViewModel computed. Filters stay
// rendered in all four states (loading, error, empty, filled).
export function BackofficeConvocationsPage() {
  const vm = useBackofficeConvocationsViewModel()

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex shrink-0 items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-foreground">Convocations</h2>
        <div className="flex items-center gap-3">
          <BackofficeFiltersToggle isCollapsed={vm.areFiltersCollapsed} hasActiveFilters={vm.isFilterActive} onToggle={vm.toggleFiltersCollapsed} />
          {/* A mode is always active: Radix reports '' on a re-click, ignored. */}
          <ToggleGroup
            type="single"
            variant="outline"
            value={vm.viewMode}
            onValueChange={(value) => value && vm.setViewMode(value as 'list' | 'calendar')}
            aria-label="Affichage"
            spacing={0}
          >
            <ToggleGroupItem value="list" className="h-11 px-4">
              <IconList className="size-4" aria-hidden />
              Liste
            </ToggleGroupItem>
            <ToggleGroupItem value="calendar" className="h-11 px-4">
              <IconCalendar className="size-4" aria-hidden />
              Calendrier
            </ToggleGroupItem>
          </ToggleGroup>
          {vm.canCreate && (
            <Button type="button" onClick={vm.goToCreate} className="h-11 rounded-full bg-coach-green px-5 text-white hover:bg-coach-green/90">
              <IconPlus className="size-4" aria-hidden />
              Créer une convocation
            </Button>
          )}
        </div>
      </div>

      {!vm.areFiltersCollapsed && (
        <div className="shrink-0">
          <ConvocationFilters vm={vm} />
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto no-scrollbar">
        {vm.viewMode === 'list' && vm.isLoading && <ConvocationTableSkeleton />}

        {!vm.isLoading && vm.error && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border px-6 py-16 text-center" role="alert">
            <p className="text-base font-semibold text-foreground">Impossible de charger les convocations</p>
            <p className="max-w-sm text-sm text-muted-foreground">Une erreur est survenue. Vérifiez votre connexion et réessayez.</p>
            <Button type="button" variant="outline" onClick={vm.retry} className="h-11 rounded-full">
              Réessayer
            </Button>
          </div>
        )}

        {vm.isEmpty && (
          <BackofficeEmptyState icon={navItem.icon} title="Aucune convocation pour l’instant">
            {vm.canCreate && (
              <Button type="button" variant="outline" onClick={vm.goToCreate} className="h-11 rounded-full">
                Créer une convocation
              </Button>
            )}
          </BackofficeEmptyState>
        )}

        {vm.isEmptyFiltered && (
          <BackofficeEmptyState icon={navItem.icon} title="Aucune convocation pour ces filtres">
            <Button type="button" variant="ghost" onClick={vm.resetFilters} className="h-11 rounded-full">
              Réinitialiser les filtres
            </Button>
          </BackofficeEmptyState>
        )}

        {vm.isEmptyAllRecorded && (
          <BackofficeEmptyState icon={navItem.icon} title="Toutes les présences sont saisies">
            <Button type="button" variant="ghost" onClick={vm.resetFilters} className="h-11 rounded-full">
              Réinitialiser les filtres
            </Button>
          </BackofficeEmptyState>
        )}

        {vm.viewMode === 'calendar' && !vm.error && (
          <ConvocationCalendar
            month={vm.month}
            rows={vm.rows}
            isLoading={vm.isLoading}
            onPreviousMonth={vm.showPreviousMonth}
            onNextMonth={vm.showNextMonth}
            onToday={vm.showToday}
            onSelect={vm.selectRow}
          />
        )}

        {vm.viewMode === 'list' && !vm.isLoading && !vm.error && vm.rows.length > 0 && (
          <>
            <ConvocationTable
              rows={vm.rows}
              expandedIds={vm.expandedIds}
              onToggleExpanded={vm.toggleExpanded}
              onEdit={vm.goToEdit}
              onOpenAttendance={vm.goToAttendance}
            />
            {vm.hasMore && (
              <div className="flex justify-center">
                <Button type="button" variant="outline" disabled={vm.isFetchingNextPage} onClick={vm.loadMore} className="h-11 rounded-full">
                  {vm.isFetchingNextPage ? 'Chargement…' : 'Charger plus'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={vm.selectedRow !== null} onOpenChange={(open) => !open && vm.clearSelectedRow()}>
        <DialogContent className="max-w-2xl">
          {vm.selectedRow && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {vm.selectedRow.teamName} · {vm.selectedRow.typeLabel}
                </DialogTitle>
                <DialogDescription>{vm.selectedRow.dateTimeLabel}</DialogDescription>
              </DialogHeader>
              <ConvocationDetailsPanel
                row={vm.selectedRow}
                onEdit={() => vm.goToEdit(vm.selectedRow!.id)}
                onOpenAttendance={() => vm.goToAttendance(vm.selectedRow!.id)}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
