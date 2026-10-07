import { ScheduleInfo } from '@presentation/shared/components/ScheduleInfo'
import { SectionLabel } from '@presentation/shared/components/SectionLabel'
import type { DirigeantEventView } from '../dirigeant-event-view'

interface NextEventCardProps {
  event: DirigeantEventView
  onOpen: (convocationId: string) => void
}

// "Prochain événement" — same card gabarit as the coach one but without a
// response bar; tapping it opens the convocation detail.
// The page renders it only when there is a next event: no empty card.
export function NextEventCard({ event, onOpen }: NextEventCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(event.id)}
      onKeyDown={(keyEvent) => {
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') onOpen(event.id)
      }}
      className="flex cursor-pointer flex-col gap-3.5 rounded-2xl border border-white/10 bg-white/5 p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11.5px] font-extrabold tracking-wider text-coach-green-label uppercase">Prochain événement</span>
        <SectionLabel name={event.section.name} type={event.section.type} />
      </div>
      <p className="m-0 text-[20px] leading-tight font-extrabold text-white">{event.title}</p>
      <ScheduleInfo dateIso={event.dateIso} location={event.location} meetingPointTime={event.meetingPointTime} />
    </div>
  )
}
