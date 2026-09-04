import type { CalendarDayInfo } from './calendar-day'
import { DayCell } from './DayCell'
import { formatWeekdayLetter } from '@presentation/shared/formatters/calendar-date'

interface MonthGridProps {
  // One entry per cell of the grid, row-major, `null` for the leading
  // padding cells before the 1st of the month (UI design §2: "cases avant
  // le 1ᵉʳ du mois... placeholders vides non interactifs, pas des jours du
  // mois précédent cliquables"). Up to 6 rows of 7 — building this
  // (including the placeholder count, which depends on which weekday the
  // 1st falls on) is useCalendarViewModel's job, TODO there.
  weeks: (CalendarDayInfo | null)[][]
  selectedDate: Date
  today: Date
  onSelectDate: (date: Date) => void
}

// One weekday-letter header row (L…D) shown once above the whole grid,
// rather than repeated per DayCell (unlike WeekDayStrip, which has no
// separate header row because it IS one row of days) — built from
// `selectedDate`'s own week isn't needed here, a fixed Monday-first
// reference date is enough since these are just column labels.
const WEEKDAY_HEADER_REFERENCE = [5, 6, 7, 8, 9, 10, 11].map((day) => new Date(2026, 0, day)) // Mon 5 Jan 2026 – Sun 11 Jan 2026

export function MonthGrid({ weeks, selectedDate, today, onSelectDate }: MonthGridProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-7 gap-1" aria-hidden>
        {WEEKDAY_HEADER_REFERENCE.map((date) => (
          <span key={date.toISOString()} className="text-center text-[10px] font-semibold text-white/45 uppercase">
            {formatWeekdayLetter(date)}
          </span>
        ))}
      </div>

      {weeks.map((week, weekIndex) => (
        // eslint-disable-next-line react/no-array-index-key -- weeks don't
        // carry a stable id of their own; index is fine, the row never
        // reorders independently of the grid itself.
        <div key={weekIndex} className="grid grid-cols-7 gap-1">
          {week.map((day, dayIndex) =>
            day ? (
              <DayCell
                key={day.date.toISOString()}
                day={day}
                selectedDate={selectedDate}
                today={today}
                onSelectDate={onSelectDate}
                showWeekdayLetter={false}
              />
            ) : (
              // Non-interactive padding cell — deliberately not a button,
              // not tappable, so it can't be mistaken for "previous month's
              // day N" (UI design §2, explicit instruction not to reproduce
              // that pattern).
              // eslint-disable-next-line react/no-array-index-key
              <span key={dayIndex} aria-hidden className="min-h-11 rounded-xl border border-white/8" />
            ),
          )}
        </div>
      ))}
    </div>
  )
}
