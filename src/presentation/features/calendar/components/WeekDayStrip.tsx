import type { CalendarDayInfo } from './calendar-day'
import { DayCell } from './DayCell'

interface WeekDayStripProps {
  // Exactly 7 entries, Monday to Sunday (UI design §2 "bande de 7 cellules,
  // L à D") — building that 7-day window around whichever week is currently
  // navigated is useCalendarViewModel's job (TODO there), this component
  // only renders whatever it's given.
  days: CalendarDayInfo[]
  selectedDate: Date
  today: Date
  onSelectDate: (date: Date) => void
}

// Week mode of CalendarRangeNav — a single row of 7 DayCells. Deliberately
// a `grid grid-cols-7` (not `flex`) so every cell gets an equal, min-w-0
// track regardless of content width (CLAUDE.md §6's side-by-side-fields
// rule applies here just as much as to a 2-column form row).
export function WeekDayStrip({ days, selectedDate, today, onSelectDate }: WeekDayStripProps) {
  return (
    <div className="grid grid-cols-7 gap-1" role="listbox" aria-label="Jour de la semaine">
      {days.map((day) => (
        <DayCell
          key={day.date.toISOString()}
          day={day}
          selectedDate={selectedDate}
          today={today}
          onSelectDate={onSelectDate}
          showWeekdayLetter
        />
      ))}
    </div>
  )
}
