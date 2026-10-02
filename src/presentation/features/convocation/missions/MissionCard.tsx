import { IconX } from '@tabler/icons-react'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Card } from '@presentation/shared/components/ui/card'
import { AssigneePill } from './AssigneePill'
import { InlineConfirm } from './InlineConfirm'
import { MemberPickerPanel } from './MemberPickerPanel'
import type { MissionView } from './useConvocationMissionsViewModel'

interface MissionCardProps {
  mission: MissionView
}

// specs/match-details-missions.md UI design "Carte de mission". Zero
// business logic: it only branches on the booleans the ViewModel computed
// (canClaim / canRelease / canManage / isClosed). A control that is not
// allowed is ABSENT, never greyed.
export function MissionCard({ mission }: MissionCardProps) {
  return (
    <Card className="flex flex-col gap-3 rounded-[20px] border border-white/10 bg-white/6 p-4 text-white ring-0 backdrop-blur-sm">
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-[17px] font-bold break-words">{mission.label}</p>
        <span
          className={`shrink-0 text-[13px] font-bold ${mission.isFull ? 'text-white/70' : 'text-coach-green'}`}
          aria-label={`${mission.assignedCount} inscrits sur ${mission.capacity}`}
        >
          {mission.assignedCount} / {mission.capacity}
        </span>
        {mission.canManage && (
          <button
            type="button"
            onClick={mission.onRequestRemoveMission}
            disabled={mission.isBusy}
            aria-label={`Supprimer la mission ${mission.label}`}
            className="-mt-3 -mr-3 -mb-3 flex size-11 shrink-0 items-center justify-center text-white/60 hover:text-white"
          >
            <span className="flex size-8 items-center justify-center rounded-lg border border-white/15 bg-white/6">
              <IconX className="size-4" aria-hidden />
            </span>
          </button>
        )}
      </div>

      {mission.assignees.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {mission.assignees.map((assignee) => (
            <li key={assignee.userId} className="min-w-0 max-w-full">
              <AssigneePill
                displayName={assignee.displayName}
                isMe={assignee.isMe}
                role={assignee.role}
                onRemove={mission.canManage ? () => mission.onRequestRemoveAssignee(assignee.userId) : undefined}
              />
            </li>
          ))}
        </ul>
      )}

      {mission.confirmation && <InlineConfirm {...mission.confirmation} />}

      {(mission.isFull || mission.isAssignedToMe || mission.canClaim || mission.canRelease || mission.canAssign) && (
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 text-[14px] font-semibold">
            {mission.isAssignedToMe && !mission.canManage ? (
              <p className="text-coach-green">Vous êtes inscrit·e</p>
            ) : (
              mission.isFull && <p className="text-white/60">Complet</p>
            )}
          </div>
          {mission.canRelease && (
            <Button
              type="button"
              variant="outline"
              onClick={mission.onRelease}
              disabled={mission.isBusy}
              className="h-11 min-w-0 shrink-0 rounded-full border-white/20 bg-white/6 px-4 text-white hover:bg-white/10 hover:text-white"
            >
              Me retirer
            </Button>
          )}
          {mission.canClaim && (
            <Button
              type="button"
              onClick={mission.onClaim}
              disabled={mission.isBusy}
              className="h-11 min-w-0 shrink-0 rounded-full bg-coach-green px-4 text-white hover:bg-coach-green/80"
            >
              Je m’en charge
            </Button>
          )}
          {mission.canAssign && !mission.isPickerOpen && (
            <Button
              type="button"
              variant="outline"
              onClick={mission.onOpenPicker}
              disabled={mission.isBusy}
              className="h-11 min-w-0 shrink-0 rounded-full border-white/20 bg-white/6 px-3text-white hover:bg-white/10 hover:text-white"
            >
              + Inscrire
            </Button>
          )}
        </div>
      )}

      {mission.isPickerOpen && (
        <MemberPickerPanel members={mission.pickerMembers} onSelect={mission.onAssign} onClose={mission.onClosePicker} />
      )}

      {mission.error && (
        <Alert variant="destructive">
          <AlertDescription>{mission.error}</AlertDescription>
        </Alert>
      )}
    </Card>
  )
}
