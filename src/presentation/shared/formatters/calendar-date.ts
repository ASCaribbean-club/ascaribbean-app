// specs/calendar.md UI design §"Structure de l'écran" point 3 — the small
// in-list section header repeating the selected date in month mode ("5
// Aoû", export `_2`), because the month grid above it can be scrolled out
// of view. Pure fr-FR display formatting, same category as
// formatConvocationDate/formatTime in match-schedule.ts — no business rule
// here (which day is "selected" is decided by useCalendarViewModel).
export function formatShortDayMonth(date: Date): string {
  const day = date.toLocaleDateString('fr-FR', { day: 'numeric' })
  const month = date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
  return `${day} ${month.charAt(0).toUpperCase()}${month.slice(1)}`
}

// "Aoû 2026" — the header subtitle (UI design point 1). Same treatment.
export function formatMonthYear(date: Date): string {
  const month = date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
  const year = date.toLocaleDateString('fr-FR', { year: 'numeric' })
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${year}`
}

// Single-letter weekday label for the week strip's day cells (L, M, M, J,
// V, S, D) — display-only, distinct from formatConvocationDate's full
// weekday name.
const WEEKDAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'] // Date#getDay(): 0 = Sunday

export function formatWeekdayLetter(date: Date): string {
  return WEEKDAY_LETTERS[date.getDay()]
}

// Two dates, same calendar day (ignores time) — used to mark "selected" and
// "today" cells, and to compare against convocation dates once grouped by
// day (TODO in useCalendarViewModel). A formatting/comparison helper, not a
// business rule — domain/rules/convocation-rules.ts already owns the actual
// "is this convocation upcoming/past" question.
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// The 7 dates (Monday to Sunday) of the week containing `date` — pure
// calendar-grid math, no Convocation involved, same "not a business rule"
// category as isSameDay above. Feeds WeekDayStrip once useCalendarViewModel
// pairs each date with its convocation types (domain/rules/
// convocation-rules.ts' groupConvocationTypesByDay).
export function getWeekDates(date: Date): Date[] {
  const weekday = date.getDay() // 0 Sun .. 6 Sat
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + mondayOffset)
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i))
}

// The month-grid skeleton around `date`: one row per calendar week
// (Monday-first, matching MonthGrid's own header), each exactly 7 cells —
// `null` before the 1st and after the last day of the month, never a
// neighboring month's actual date (UI design §2: those padding cells stay
// non-interactive, not clickable "day N of last month").
export function getMonthGridDates(date: Date): (Date | null)[][] {
  const year = date.getFullYear()
  const month = date.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstWeekday = new Date(year, month, 1).getDay() // 0 Sun .. 6 Sat
  const leadingNulls = firstWeekday === 0 ? 6 : firstWeekday - 1

  const cells: (Date | null)[] = [
    ...Array<null>(leadingNulls).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ]
  while (cells.length % 7 !== 0) {
    cells.push(null)
  }

  const weeks: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
}

// `selectedDate` shifted by `deltaWeeks` × 7 days — CalendarRangeNav's
// "Semaine précédente/suivante" chevrons in week mode. No season boundary
// check (UI design, Question ouverte 2 — "non, laisser le jour revenir
// vide" is the recorded recommendation): free to land anywhere, including
// a week with nothing in it, which CalendarConvocationList's own empty
// state already covers.
export function addWeeks(date: Date, deltaWeeks: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + deltaWeeks * 7)
}

// `selectedDate` shifted by `deltaMonths` whole months, day-of-month
// preserved when the target month has it, clamped to that month's last day
// otherwise (31 Jan − 1 month → 28/29 Feb, never rolling into March the way
// a naive `setMonth(month - 1)` would). Same "no season boundary" rule as
// addWeeks — used by CalendarRangeNav's chevrons in month mode.
export function addMonths(date: Date, deltaMonths: number): Date {
  const day = date.getDate()
  const firstOfTargetMonth = new Date(date.getFullYear(), date.getMonth() + deltaMonths, 1)
  const daysInTargetMonth = new Date(firstOfTargetMonth.getFullYear(), firstOfTargetMonth.getMonth() + 1, 0).getDate()
  return new Date(firstOfTargetMonth.getFullYear(), firstOfTargetMonth.getMonth(), Math.min(day, daysInTargetMonth))
}
