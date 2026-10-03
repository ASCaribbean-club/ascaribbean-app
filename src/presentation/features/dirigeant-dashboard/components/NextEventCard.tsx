import { ScheduleInfo } from '@presentation/shared/components/ScheduleInfo'
import { SectionLabel } from '@presentation/shared/components/SectionLabel'
import type { DirigeantEventView } from '../dirigeant-event-view'

interface NextEventCardProps {
  event: DirigeantEventView
}

// "Prochain événement" — same card gabarit as the coach one but without a
// response bar and NOT tappable (no role="button", no chevron: the detail
// variant for the officer is deferred, PO-DH-15 / AC-DH-16).
// The page renders it only when there is a next event: no empty card.
export function NextEventCard({ event }: NextEventCardProps) {
  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11.5px] font-extrabold tracking-wider text-coach-green-label uppercase">Prochain événement</span>
        <SectionLabel name={event.section.name} type={event.section.type} />
      </div>
      <p className="m-0 text-[20px] leading-tight font-extrabold text-white">{event.title}</p>
      <ScheduleInfo dateIso={event.dateIso} location={event.location} meetingPointTime={event.meetingPointTime} />
    </div>
  )
}
