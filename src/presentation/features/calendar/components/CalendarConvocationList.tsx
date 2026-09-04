import type { CalendarRangeMode } from './RangeModeToggle'
import type { CalendarListItem } from './calendar-list-item'
import { CalendarConvocationRow } from './CalendarConvocationRow'
import { formatShortDayMonth } from '@presentation/shared/formatters/calendar-date'

interface CalendarConvocationListProps {
  items: CalendarListItem[]
  mode: CalendarRangeMode
  selectedDate: Date
  onOpen: (convocationId: string) => void
}

// UI design §"Structure de l'écran" points 3–4 — the list for whichever
// single day is currently selected (filtering `items` down to that day is
// useCalendarViewModel's job; this component just renders what it's given,
// same rule as CalendarRangeNav). Two states of its own:
//   - month mode: a small "5 Aoû" section header repeats the selected date,
//     because the month grid above can be scrolled out of view (week mode
//     skips it — the day strip stays visible as the reference, UI design's
//     own reasoning for the asymmetry).
//   - no events that day: a lightweight centered message, NOT the full
//     shared EmptyState — that heavier treatment is reserved for the
//     whole-screen "no team/season/convocations at all" case (AC-CA-11),
//     rendered one level up in CalendarPage so this component doesn't need
//     to know the difference between "empty day" and "empty everything".
export function CalendarConvocationList({ items, mode, selectedDate, onOpen }: CalendarConvocationListProps) {
  return (
    <section className="flex flex-col gap-1">
      {mode === 'month' && (
        <h3 className="mb-1 text-[13px] font-bold text-white/60">{formatShortDayMonth(selectedDate)}</h3>
      )}

      {items.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-white/50">Aucun événement ce jour</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {items.map((item) => (
            <CalendarConvocationRow
              key={item.convocation.id}
              convocation={item.convocation}
              matchDetails={item.matchDetails}
              opponent={item.opponent}
              meetingDetails={item.meetingDetails}
              responseBlock={item.responseBlock}
              onOpen={onOpen}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
