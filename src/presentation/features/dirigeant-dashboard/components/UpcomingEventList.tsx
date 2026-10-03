import { SectionLabel } from '@presentation/shared/components/SectionLabel'
import { CONVOCATION_TYPE_ACCENT } from '@presentation/shared/formatters/convocation-type-accent'
import { formatEventSchedule } from '@presentation/shared/formatters/match-schedule'
import type { DirigeantEventView } from '../dirigeant-event-view'

interface UpcomingEventListProps {
  title: string
  items: DirigeantEventView[]
  onSeeCalendar: () => void
}

// Rows are NOT tappable (no onClick, no role, no cursor-pointer): the
// officer's convocation detail is deferred (PO-DH-15, AC-DH-16). No response
// badge either — replaced by the section label.
export function UpcomingEventList({ title, items, onSeeCalendar }: UpcomingEventListProps) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[15px] font-extrabold text-white">{title}</h2>
        <button
          type="button"
          className="flex h-11 items-center text-[13px] font-semibold text-coach-green-link"
          onClick={onSeeCalendar}
        >
          Voir le calendrier
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-[13px] text-white/50">Aucune échéance à venir</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {items.map((event) => (
            <li
              key={event.id}
              className="relative mb-3 flex items-start justify-between gap-3 border-b border-white/8 pb-3 pl-3.5 last:mb-0 last:border-b-0 last:pb-0"
            >
              <span aria-hidden className={`absolute top-0.5 bottom-3.5 left-0 w-0.75 rounded-full ${CONVOCATION_TYPE_ACCENT[event.type].rail}`} />
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[13.5px] leading-tight font-bold text-white">{event.title}</p>
                <p className="m-0 mt-0.75 text-[11.5px] font-semibold text-white/50">
                  {formatEventSchedule(event.dateIso, event.location)}
                </p>
              </div>
              <SectionLabel name={event.section.name} type={event.section.type} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
