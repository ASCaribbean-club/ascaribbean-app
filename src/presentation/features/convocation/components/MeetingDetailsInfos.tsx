import type { MeetingDetails } from '@domain/entities/meeting-details'
import { AgendaList } from './AgendaList'

interface MeetingDetailsInfosProps {
  meetingDetails: MeetingDetails
}

export function MeetingDetailsInfos({ meetingDetails }: MeetingDetailsInfosProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="flex items-baseline justify-between">
        <span className="text-[13px] font-bold text-white/70">Ordre du jour</span>
        <span className="text-[12px] font-semibold text-white/50">{meetingDetails.agenda.length} points</span>
      </span>
      <AgendaList agenda={meetingDetails.agenda} />
    </div>
  )
}
