import type { UpcomingConvocation } from '@domain/usecases/coach-dashboard/ListUpcomingTeamConvocationsUseCase'
import { formatCountdown } from '../../../shared/formatters/countdown'
import { formatEventSchedule, formatMatchSchedule } from '../../../shared/formatters/match-schedule'
import { Badge } from '../../../shared/components/ui/badge'
import { Card } from '../../../shared/components/ui/card'
import { ResponseBar } from './ResponseBar'

interface NextTrainingOrMatchCardProps {
  nextTrainingOrMatch: UpcomingConvocation | undefined
  onOpen: () => void
}

export function NextTrainingOrMatchCard({ nextTrainingOrMatch, onOpen }: NextTrainingOrMatchCardProps) {
  if (!nextTrainingOrMatch) return null // AC-CD-02 : état vide géré par le parent (aucune échéance à venir)

  const { convocation, responseCounts, matchDetails, opponent } = nextTrainingOrMatch

  // `nextMatch` can be a training convocation too (useCoachDashboardViewModel
  // picks the first upcoming training-or-match) or a match whose
  // MatchDetails row isn't written yet — in both cases opponent/RDV are
  // absent, so the card degrades to the plain date · lieu line rather than
  // rendering a title-less gap or a faked opponent name.
  const schedule =
    opponent && matchDetails
      ? formatMatchSchedule(convocation.date, convocation.location, matchDetails.meetingPointTime)
      : formatEventSchedule(convocation.date, convocation.location)

  return (
    // UI design §2 : tape sur la carte "hors zone barre" ouvre le détail —
    // la barre elle-même n'est qu'un indicateur (PO-4), d'où le
    // stopPropagation ci-dessous plutôt qu'un <button> englobant toute la carte.
    <Card
      onClick={onOpen}
      role="button"
      tabIndex={0}
      className="flex cursor-pointer flex-col gap-3.5 rounded-[20px] border-white/10 bg-white/6 p-4.5 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] font-extrabold tracking-wider text-coach-green-label uppercase">
          PROCHAIN {nextTrainingOrMatch.convocation.type.toUpperCase()}
        </span>
        <Badge className="rounded-full bg-coach-red-badge px-2.25 py-0.75 text-[10.5px] font-extrabold text-white">
          {formatCountdown(convocation.date, new Date())}
        </Badge>
      </div>

      {opponent && <p className="text-[21px] leading-tight font-extrabold text-white">{opponent.name}</p>}

      <p className="text-[12.5px] text-white/60">{schedule}</p>

      <div onClick={(event) => event.stopPropagation()}>
        <ResponseBar counts={responseCounts} />
      </div>
    </Card>
  )
}
