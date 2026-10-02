import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ConvocationType } from '@domain/entities/convocation'
import type { MissionTemplate } from '@domain/entities/mission-template'
import { useMissionTemplatesDependencies } from '@presentation/di/hooks/use-mission-templates-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'
import { missionTypeLabel, selectMissionRows } from './mission-template-view'

export type MissionTemplateDialogState =
  | { mode: 'create'; convocationType: ConvocationType }
  | { mode: 'edit'; missionTemplate: MissionTemplate }
  | null

// specs/web-mission-templates.md §2.4/AC-MT-12..16 — the
// /admin/mission-templates console. One query (all templates), filtered by
// the active type tab client-side; creation/edition live in
// useMissionTemplateFormDialogViewModel, (de)activation here.
export function useBackofficeMissionTemplatesViewModel() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { listMissionTemplatesUseCase, setMissionTemplateActiveUseCase } = useMissionTemplatesDependencies()
  // AC-MT-16 — independent of route access. When false the write controls
  // disappear, never grayed out.
  const canManage = usePermission('mission-template:manage')

  const [activeType, setActiveType] = useState<ConvocationType>('training')
  const [dialog, setDialog] = useState<MissionTemplateDialogState>(null)

  const templatesQuery = useQuery({
    queryKey: queryKeys.missionTemplatesRoot(),
    queryFn: () => listMissionTemplatesUseCase.execute(),
  })

  const toggleMutation = useMutation({
    mutationFn: (input: { missionTemplateId: string; isActive: boolean }) => {
      if (!user) {
        // Unreachable in practice — RequireBackofficeAccess already gated
        // this screen on an admin session.
        throw new Error('No authenticated admin session.')
      }
      return setMissionTemplateActiveUseCase.execute({ actorId: user.id, ...input })
    },
    onSuccess: () => {
      // AC-MT-15 — invalidate the whole root.
      void queryClient.invalidateQueries({ queryKey: queryKeys.missionTemplatesRoot() })
    },
  })

  return {
    isLoading: templatesQuery.isLoading,
    error: templatesQuery.error ? mapDomainErrorToUiError(templatesQuery.error) : null,
    refetch: () => void templatesQuery.refetch(),
    rows: selectMissionRows(templatesQuery.data ?? [], activeType),
    canManage,

    activeType,
    activeTypeLabel: missionTypeLabel(activeType),
    selectType: (type: ConvocationType) => setActiveType(type),

    dialog,
    openCreateDialog: () => setDialog({ mode: 'create', convocationType: activeType }),
    openEditDialog: (missionTemplate: MissionTemplate) => setDialog({ mode: 'edit', missionTemplate }),
    closeDialog: () => setDialog(null),

    toggleActive: (missionTemplate: MissionTemplate) =>
      toggleMutation.mutate({ missionTemplateId: missionTemplate.id, isActive: !missionTemplate.isActive }),
    // The row currently being (de)activated — disables only that row's button.
    pendingToggleId: toggleMutation.isPending ? toggleMutation.variables.missionTemplateId : null,
    toggleErrorMessage: toggleMutation.error ? mapDomainErrorToUiError(toggleMutation.error).message : null,
  }
}
