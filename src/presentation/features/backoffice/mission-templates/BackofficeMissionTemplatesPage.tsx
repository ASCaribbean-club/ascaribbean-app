import { IconInfoCircle, IconPlus } from '@tabler/icons-react'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'
import { BackofficeEmptyState } from '@presentation/features/backoffice/components/BackofficeEmptyState'
import { MissionTemplateFormDialog } from './components/MissionTemplateFormDialog'
import { MissionTemplateTable } from './components/MissionTemplateTable'
import { MissionTemplateTableSkeleton } from './components/MissionTemplateTableSkeleton'
import { MissionTemplateTypeTabs } from './components/MissionTemplateTypeTabs'
import { useBackofficeMissionTemplatesViewModel } from './useBackofficeMissionTemplatesViewModel'

const navItem = BACKOFFICE_NAV_ITEMS.find((item) => item.id === 'mission-templates')!

const ADD_BUTTON_CLASSNAME = 'h-11 shrink-0 rounded-full bg-coach-green px-4 font-bold text-white hover:bg-coach-green'

// specs/web-mission-templates.md UI design "Écran". Zero business logic: every
// `if` branches on a boolean the ViewModel already computed.
export function BackofficeMissionTemplatesPage() {
  const vm = useBackofficeMissionTemplatesViewModel()
  const isEmpty = !vm.isLoading && !vm.error && vm.rows.length === 0
  const hasRows = !vm.isLoading && !vm.error && vm.rows.length > 0

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h2 className="text-xl font-bold text-foreground">Référentiel des missions</h2>

      <Alert>
        <IconInfoCircle aria-hidden />
        <AlertDescription>
          Les modifications s'appliquent aux prochaines convocations uniquement. Les convocations déjà créées ne sont pas modifiées.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between gap-4">
        <MissionTemplateTypeTabs activeType={vm.activeType} onSelect={vm.selectType} />
        {vm.canManage && (
          <Button type="button" onClick={vm.openCreateDialog} className={ADD_BUTTON_CLASSNAME}>
            <IconPlus className="size-4" aria-hidden />
            Mission
          </Button>
        )}
      </div>

      {vm.toggleErrorMessage && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{vm.toggleErrorMessage}</AlertDescription>
        </Alert>
      )}

      {vm.isLoading && <MissionTemplateTableSkeleton />}

      {!vm.isLoading && vm.error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{vm.error.message}</span>
            <Button type="button" variant="outline" onClick={vm.refetch} className="h-11 rounded-full">
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isEmpty && (
        <BackofficeEmptyState
          icon={navItem.icon}
          title={`Aucune mission pour « ${vm.activeTypeLabel} »`}
          description="Les nouvelles convocations de ce type seront créées sans mission par défaut."
        >
          {vm.canManage && (
            <Button type="button" onClick={vm.openCreateDialog} className={`mt-2 ${ADD_BUTTON_CLASSNAME}`}>
              <IconPlus className="size-4" aria-hidden />
              Ajouter une mission
            </Button>
          )}
        </BackofficeEmptyState>
      )}

      {hasRows && (
        <MissionTemplateTable
          rows={vm.rows}
          canManage={vm.canManage}
          pendingToggleId={vm.pendingToggleId}
          onEdit={vm.openEditDialog}
          onToggleActive={vm.toggleActive}
        />
      )}

      <MissionTemplateFormDialog dialog={vm.dialog} onClose={vm.closeDialog} />
    </div>
  )
}
