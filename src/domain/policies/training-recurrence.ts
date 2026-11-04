// Duplication of a training at a given frequency (backoffice). Pure rules:
// no clock, no I/O. Dates are read and written in the runtime's local time so
// a 18:30 training stays at 18:30 across a daylight-saving change (adding
// 7 * 24h in milliseconds would shift it by an hour).

export type TrainingRecurrenceFrequency = 'daily' | 'weekly' | 'biweekly'

export const TRAINING_RECURRENCE_FREQUENCIES: readonly TrainingRecurrenceFrequency[] = ['daily', 'weekly', 'biweekly']

// Business rule: copies never extend further than 3 months after the
// duplicated training.
export const MAX_RECURRENCE_MONTHS = 3

const STEP_IN_DAYS: Record<TrainingRecurrenceFrequency, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
}

// Last calendar day (inclusive) a copy may fall on: `startsAt` + 3 months,
// clamped to the end of a shorter month (31 Jan -> 30 Apr, never 1 May).
export function getMaxRecurrenceEnd(startsAt: Date): Date {
  const target = new Date(startsAt.getFullYear(), startsAt.getMonth() + MAX_RECURRENCE_MONTHS, 1)
  const lastDayOfTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  return new Date(target.getFullYear(), target.getMonth(), Math.min(startsAt.getDate(), lastDayOfTargetMonth))
}

function calendarDayValue(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

// `until` is a calendar day, inclusive: only its day counts, not its time.
export function isRecurrenceEndAllowed(startsAt: Date, until: Date): boolean {
  return calendarDayValue(until) <= calendarDayValue(getMaxRecurrenceEnd(startsAt))
}

// The dates of the copies, in order, WITHOUT the original training. Empty when
// `until` is before the first copy.
export function computeTrainingOccurrences(startsAt: Date, frequency: TrainingRecurrenceFrequency, until: Date): Date[] {
  const step = STEP_IN_DAYS[frequency]
  const lastDay = calendarDayValue(until)
  const occurrences: Date[] = []

  for (let index = 1; ; index += 1) {
    const occurrence = new Date(
      startsAt.getFullYear(),
      startsAt.getMonth(),
      startsAt.getDate() + index * step,
      startsAt.getHours(),
      startsAt.getMinutes(),
      startsAt.getSeconds(),
    )
    if (calendarDayValue(occurrence) > lastDay) return occurrences
    occurrences.push(occurrence)
  }
}
