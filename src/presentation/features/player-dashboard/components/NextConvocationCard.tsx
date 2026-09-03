import type { UpcomingConvocationForPlayer } from '@domain/usecases/player-dashboard/ListUpcomingConvocationsForPlayerUseCase'
import { Card } from '../../../shared/components/ui/card'
import { formatConvocationType, getConvocationTypeIcon } from '../../../shared/formatters/convocation-labels'
import { ResponseActions } from '@presentation/shared/components/ResponseActions'
import { ScheduleInfo } from '@presentation/shared/components/ScheduleInfo'

interface NextConvocationCardProps {
  data: UpcomingConvocationForPlayer | undefined
  canRespond: boolean
  onRespondPresent: () => void
  onRespondAbsent: () => void
  onOpen: () => void
}

// specs/player-dashboard.md UI design §3 — reuses the coach's "Prochain
// match" card structure (bandeau + titre + méta, see
// coach-dashboard/components/NextTrainingOrMatchCard.tsx) but:
//   - no countdown badge ("J-3") — not founded for the player, absent from
//     the mockups (§3, "Pas de badge compte à rebours");
//   - renders EVERY convocation type, not just training/match (§1 point
//     3), hence the icon + type-specific title logic below;
//   - no ResponseBar (team aggregate — PO-PD-05, AC-PD-09): the player's
//     own status is carried entirely by ResponseActions's button states,
//     never a separate status label (§3, "évite de dupliquer
//     l'information entre un libellé de statut et l'état visuel des
//     boutons").
export function NextConvocationCard({ data, canRespond, onRespondPresent, onRespondAbsent, onOpen }: NextConvocationCardProps) {
  if (!data) return null // AC-PD-02 : état vide géré par le parent (aucune échéance à venir)

  const { convocation, matchDetails, opponent, meetingDetails, myResponse } = data
  const Icon = getConvocationTypeIcon(convocation.type)


  const title =
    convocation.type === 'match' && opponent
      ? opponent.name
      : convocation.type === 'meeting' && meetingDetails
        ? meetingDetails.title
        : formatConvocationType(convocation.type)

  const meetingPointTime = convocation.type === 'match' && matchDetails ? matchDetails.meetingPointTime : null

  return (
    // Tap on the card (outside the buttons) opens the detail (AC-PD-14) —
    // same stopPropagation split as the coach card, so a tap on
    // Présent/Absent doesn't also trigger navigation.
    <Card
      onClick={onOpen}
      role="button"
      tabIndex={0}
      className="flex cursor-pointer flex-col gap-3.5 rounded-[20px] border-white/10 bg-white/6 p-4.5 backdrop-blur-sm"
    >
      <span className="text-[11.5px] font-extrabold tracking-wider text-coach-green-label uppercase">
        Prochaine convocation
      </span>

      <div className="flex items-center gap-2">
        <Icon className="size-5 shrink-0 text-white/70" aria-hidden />
        <p className="text-[19px] leading-tight font-extrabold text-white">{title}</p>
      </div>

      <ScheduleInfo dateIso={convocation.date} location={convocation.location} meetingPointTime={meetingPointTime} />

      <div onClick={(event) => event.stopPropagation()}>
        <ResponseActions
          canRespond={canRespond}
          myResponse={myResponse?.status ?? null}
          onRespondPresent={onRespondPresent}
          onRespondAbsent={onRespondAbsent}
        />
      </div>
    </Card>
  )
}
