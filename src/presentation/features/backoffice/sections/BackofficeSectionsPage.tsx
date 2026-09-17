import { IconPlus } from '@tabler/icons-react'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@presentation/shared/components/ui/select'
import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'
import { BackofficeEmptyState } from '@presentation/features/backoffice/components/BackofficeEmptyState'
import { SectionFormDialog } from './components/SectionFormDialog'
import { SectionTable } from './components/SectionTable'
import { SectionTableSkeleton } from './components/SectionTableSkeleton'
import { SECTION_TYPE_OPTIONS } from './section-type-options'
import { useBackofficeSectionsViewModel } from './useBackofficeSectionsViewModel'

const navItem = BACKOFFICE_NAV_ITEMS.find((item) => item.id === 'sections')!

// specs/section-and-teams.md AC-ST-16 — replaces the BackofficeEmptyState
// stub (which rendered unconditionally, no query, no use case, AC-WE-11/
// AC-WE-12): /admin/sections is now the sections write console. Zero
// business logic here (CLAUDE.md §4/§6): every `if` below branches on a
// boolean the ViewModel already computed.
export function BackofficeSectionsPage() {
  const vm = useBackofficeSectionsViewModel()

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-foreground">Sections</h2>
        {/* AC-ST-20 — rendered only if canWriteSections, never grayed out:
            "une carte disparaît, elle n'apparaît pas désactivée". */}
        {vm.canWriteSections && (
          <Button
            type="button"
            onClick={vm.openCreateDialog}
            className="h-11 rounded-full bg-coach-green px-4 font-bold text-white hover:bg-coach-green"
          >
            <IconPlus className="size-4" aria-hidden />
            Section
          </Button>
        )}
      </div>

      <div className="w-full max-w-[240px]">
        <Select value={vm.typeFilter} onValueChange={(value) => vm.setTypeFilter(value as typeof vm.typeFilter)}>
          <SelectTrigger className="h-11 w-full rounded-xl">
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {SECTION_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {vm.isLoading && <SectionTableSkeleton />}

      {!vm.isLoading && vm.error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{vm.error.message}</AlertDescription>
        </Alert>
      )}

      {!vm.isLoading && !vm.error && vm.rows.length === 0 && vm.isFilterActive && (
        <BackofficeEmptyState
          icon={navItem.icon}
          title="Aucune section ne correspond à ce filtre"
          description="Réinitialisez le filtre pour voir toutes les sections."
        />
      )}

      {!vm.isLoading && !vm.error && vm.rows.length === 0 && !vm.isFilterActive && (
        <BackofficeEmptyState icon={navItem.icon} title={navItem.emptyStateTitle} />
      )}

      {!vm.isLoading && !vm.error && vm.rows.length > 0 && (
        <SectionTable rows={vm.rows} canWriteSections={vm.canWriteSections} onEdit={vm.openEditDialog} />
      )}

      <SectionFormDialog dialog={vm.dialog} onClose={vm.closeDialog} />
    </div>
  )
}
