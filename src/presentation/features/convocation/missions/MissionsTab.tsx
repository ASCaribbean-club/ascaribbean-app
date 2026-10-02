import { IconChecklist } from '@tabler/icons-react'
import { EmptyState } from '@presentation/shared/components/EmptyState'
import { Button } from '@presentation/shared/components/ui/button'
import { Skeleton } from '@presentation/shared/components/ui/skeleton'
import { AdHocMissionForm } from './AdHocMissionForm'
import { MissionCard } from './MissionCard'
import { MissionsClosedBanner } from './MissionsClosedBanner'
import type { ConvocationMissionsViewModel } from './useConvocationMissionsViewModel'

interface MissionsTabProps {
  missions: ConvocationMissionsViewModel
}

// specs/match-details-missions.md UI design — "Missions" tab. Only
// loading / error / empty branches and the booleans the ViewModel computed.
export function MissionsTab({ missions }: MissionsTabProps) {
  if (missions.isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-28 rounded-[20px] bg-white/8" />
        <Skeleton className="h-28 rounded-[20px] bg-white/8" />
      </div>
    )
  }

  if (missions.errorMessage) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-[13px] text-white/80">{missions.errorMessage}</p>
        <Button type="button" variant="secondary" onClick={missions.onRetry} className="h-11">
          Réessayer
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {missions.showClosedBanner && <MissionsClosedBanner />}

      {missions.isEmpty ? (
        <EmptyState icon={IconChecklist} message="Aucune mission pour cette convocation." />
      ) : (
        missions.missions.map((mission) => <MissionCard key={mission.id} mission={mission} />)
      )}

      {missions.canManage && <AdHocMissionForm form={missions.adHocForm} />}
    </div>
  )
}
