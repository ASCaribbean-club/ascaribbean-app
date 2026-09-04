import type { CalendarDayInfo } from './calendar-day'
import { EventTypeDots } from './EventTypeDots'
import { cn } from '@presentation/shared/lib/utils'
import { formatWeekdayLetter, isSameDay } from '@presentation/shared/formatters/calendar-date'

interface DayCellProps {
  day: CalendarDayInfo
  selectedDate: Date
  today: Date
  onSelectDate: (date: Date) => void
  // Week mode shows the weekday letter above the day number ("L", "M"…);
  // month mode omits it (MonthGrid already renders one weekday-letter row
  // above the whole grid instead of repeating it per cell) — UI design §2.
  showWeekdayLetter: boolean
}

// Single tappable day, shared by WeekDayStrip (7 of these in a row) and
// MonthGrid (up to 42, 6×7). One component rather than two near-duplicates
// because the visual rules (selected fill, today's outline, dot markers,
// ≥44px tap target) are identical in both modes — only the weekday-letter
// row above differs, and that's handled by the parent, not by branching
// inside this cell.
export function DayCell({ day, selectedDate, today, onSelectDate, showWeekdayLetter }: DayCellProps) {
  const isSelected = isSameDay(day.date, selectedDate)
  const isToday = isSameDay(day.date, today)

  return (
    <button
      type="button"
      onClick={() => onSelectDate(day.date)}
      aria-pressed={isSelected}
      aria-label={day.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
      className={cn(
        // AC-CA-19: the whole cell is the tap target, floored at 44px in
        // both dimensions, not just the day-number glyph. `min-w-0` lets
        // each cell shrink to its grid track on a narrow phone instead of
        // overflowing it (CLAUDE.md §6).
        'flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition-colors',
        isSelected
          ? 'bg-coach-green text-white'
          : isToday
            // Today, unselected: a subtle outline rather than a second
            // solid fill — the spec leaves "today vs selected" open
            // (UI design, Question ouverte 1) when they diverge, so this
            // is a light, reversible default, not a final answer.
            ? 'border border-coach-green/50 text-white/85'
            : 'text-white/70 hover:bg-white/6',
      )}
    >
      {showWeekdayLetter && (
        <span className={cn('text-[10px] font-semibold uppercase', isSelected ? 'text-white/85' : 'text-white/45')}>
          {formatWeekdayLetter(day.date)}
        </span>
      )}
      <span className="text-[15px] font-extrabold leading-none">{day.date.getDate()}</span>
      <EventTypeDots types={day.types} />
    </button>
  )
}
