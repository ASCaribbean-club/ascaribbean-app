import { IconFilter, IconInfoCircle } from '@tabler/icons-react'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { FloatingActionButton } from '@presentation/shared/components/FloatingActionButton'
import { Skeleton } from '@presentation/shared/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@presentation/shared/components/ui/toggle-group'
import { NewsManagementRow } from './components/NewsManagementRow'
import { useNewsManagementViewModel } from './useNewsManagementViewModel'

const STATUS_ITEM_CLASSNAME =
  'h-11 min-w-0 flex-1 rounded-full border border-white/12 bg-white/5 px-2.5 text-[13px] font-semibold text-white/80 hover:bg-white/10 hover:text-white data-[state=on]:border-white data-[state=on]:bg-white data-[state=on]:text-black'

// Dirigeant view of the Actus tab (specs/mobile-dirigeant-habilite.md §1.3,
// UI design §3). No business logic: only the branches the ViewModel computed.
export function NewsManagementPage() {
  const vm = useNewsManagementViewModel()

  return (
    <div className="flex min-h-[75svh] flex-col gap-5 px-5.5 pt-[max(1.375rem,env(safe-area-inset-top))] pb-28 text-white">
      <header className="flex flex-col gap-2 pt-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[26px] font-extrabold text-white">Actus du club</h1>
          {/* Shows/hides the status filter. The dot signals a filter still
              applied while the bar is hidden. */}
          <button
            type="button"
            onClick={vm.toggleFilters}
            aria-label={vm.areFiltersVisible ? 'Masquer les filtres' : 'Afficher les filtres'}
            aria-expanded={vm.areFiltersVisible}
            className="relative flex size-11 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <IconFilter className="size-5" aria-hidden />
            {!vm.areFiltersVisible && vm.isFilterActive && (
              <span className="absolute top-2 right-2 size-2 rounded-full bg-coach-green" aria-hidden />
            )}
          </button>
        </div>
        <div aria-hidden className="h-1 w-24 rounded-full bg-linear-to-r from-coach-red via-coach-green to-white" />
      </header>

      <Alert className="border-white/12 bg-white/5 text-white">
        <IconInfoCircle aria-hidden />
        <AlertDescription className="text-[13px] text-white/70">Les brouillons ne sont pas visibles des membres.</AlertDescription>
      </Alert>

      {vm.areFiltersVisible && (
        <ToggleGroup
          type="single"
          aria-label="Filtrer par statut"
          value={vm.statusFilter}
          onValueChange={vm.onChangeStatusFilter}
          spacing={1.5}
          className="w-full"
        >
          <ToggleGroupItem value="all" className={STATUS_ITEM_CLASSNAME}>
            Toutes
          </ToggleGroupItem>
          <ToggleGroupItem value="draft" className={STATUS_ITEM_CLASSNAME}>
            Brouillons
          </ToggleGroupItem>
          <ToggleGroupItem value="published" className={STATUS_ITEM_CLASSNAME}>
            Publiées
          </ToggleGroupItem>
        </ToggleGroup>
      )}

      {vm.savedNotice && (
        <p role="status" className="text-[13px] font-semibold text-coach-green-text">
          {vm.savedNotice}
        </p>
      )}

      {vm.isLoading && (
        <div className="flex flex-col gap-5" aria-hidden>
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-24 bg-white/10" />
              <Skeleton className="h-5 w-full bg-white/10" />
              <Skeleton className="h-9 w-full bg-white/10" />
            </div>
          ))}
        </div>
      )}

      {vm.error && (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-[13px] text-white/70">
            Impossible de charger les actus.
          </p>
          <Button type="button" variant="outline" onClick={vm.retry} className="h-11 border-white/20 text-white">
            Réessayer
          </Button>
        </div>
      )}

      {!vm.isLoading && !vm.error && vm.rows.length === 0 && <p className="text-[13px] text-white/50">{vm.emptyLabel}</p>}

      {!vm.isLoading && !vm.error && vm.rows.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-5 p-0">
          {vm.rows.map((row) => (
            <li key={row.id} className="border-b border-white/8 pb-5 last:border-b-0 last:pb-0">
              <NewsManagementRow row={row} onEdit={vm.openEdit} />
            </li>
          ))}
        </ul>
      )}

      <FloatingActionButton visible={vm.canCreateNews} label="Créer une actu" onClick={vm.openCreate} />
    </div>
  )
}
