// Calendar view of /admin/convocations — pure month-grid helpers (fr-FR, weeks
// start on Monday). `Date` arguments are local time, like every date the
// screen shows.
export interface CalendarCell<T> {
  key: string
  day: number
  inMonth: boolean
  isToday: boolean
  items: T[]
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addMonths(month: Date, delta: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + delta, 1)
}

// [from, to) covering exactly the month, as ISO instants for the server query.
export function monthRange(month: Date): { from: string; to: string } {
  const start = startOfMonth(month)
  return { from: start.toISOString(), to: addMonths(start, 1).toISOString() }
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

// Full weeks (Mon..Sun) around the month; days outside it are `inMonth: false`
// and stay empty — the query only loads the month itself.
export function buildMonthGrid<T>(month: Date, items: T[], getDate: (item: T) => string, today: Date): CalendarCell<T>[] {
  const start = startOfMonth(month)
  const leading = (start.getDay() + 6) % 7
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
  const total = Math.ceil((leading + daysInMonth) / 7) * 7

  const byDay = new Map<string, T[]>()
  for (const item of items) {
    const key = dayKey(new Date(getDate(item)))
    byDay.set(key, [...(byDay.get(key) ?? []), item])
  }
  for (const list of byDay.values()) list.sort((a, b) => new Date(getDate(a)).getTime() - new Date(getDate(b)).getTime())

  const todayKey = dayKey(today)
  return Array.from({ length: total }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), index - leading + 1)
    const inMonth = date.getMonth() === start.getMonth()
    const key = dayKey(date)
    return {
      key,
      day: date.getDate(),
      inMonth,
      isToday: key === todayKey,
      items: inMonth ? (byDay.get(key) ?? []) : [],
    }
  })
}

export function formatMonthLabel(month: Date): string {
  const label = month.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
