import { IconCalendarEvent, IconClock, IconMapPin } from '@tabler/icons-react'
import { formatConvocationDate, formatTime } from '../formatters/match-schedule'
import { Badge } from './ui/badge'

interface ScheduleInfoProps {
  dateIso: string
  location: string
  meetingPointTime: string | null | undefined
}

// specs/coach-dashboard.md UI design — addendum : trois éléments à poids
// visuel décroissant (date/heure, lieu, badge RDV optionnel) plutôt que le
// bloc `formatMatchSchedule()` à trois lignes de texte brut jointes par
// `\n`. Partagé entre la carte coach et la carte joueur — mêmes données,
// même hiérarchie visuelle des deux côtés.
export function ScheduleInfo({ dateIso, location, meetingPointTime }: ScheduleInfoProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <IconCalendarEvent className="size-3.5 shrink-0 text-white/45" aria-hidden />
        <span className="text-[13px] font-semibold text-white/80">{formatConvocationDate(dateIso)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <IconMapPin className="size-3.5 shrink-0 text-white/45" aria-hidden />
        <span className="text-[12px] font-normal text-white/55">{location}</span>
      </div>
      {meetingPointTime && (
        <Badge
          variant="outline"
          className="mt-0.5 w-fit gap-1 border-white/15 bg-white/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white/70"
        >
          <IconClock className="size-3" aria-hidden />
          RDV {formatTime(meetingPointTime)}
        </Badge>
      )}
    </div>
  )
}
