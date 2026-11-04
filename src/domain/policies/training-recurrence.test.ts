import { describe, expect, it } from 'vitest'
import { computeTrainingOccurrences, getMaxRecurrenceEnd, isRecurrenceEndAllowed } from './training-recurrence'

// Local-time constructors on purpose: the rules read local calendar days.
function local(year: number, month: number, day: number, hours = 18, minutes = 30): Date {
  return new Date(year, month - 1, day, hours, minutes)
}

describe('getMaxRecurrenceEnd', () => {
  it('is the same day of month, 3 months later', () => {
    expect(getMaxRecurrenceEnd(local(2026, 11, 4))).toEqual(local(2027, 2, 4, 0, 0))
  })

  it('clamps to the end of a shorter month', () => {
    expect(getMaxRecurrenceEnd(local(2026, 1, 31))).toEqual(local(2026, 4, 30, 0, 0))
  })

  it('crosses the year boundary', () => {
    expect(getMaxRecurrenceEnd(local(2026, 12, 15))).toEqual(local(2027, 3, 15, 0, 0))
  })
})

describe('isRecurrenceEndAllowed', () => {
  const start = local(2026, 11, 4)

  it('accepts the last allowed day, whatever the time of day', () => {
    expect(isRecurrenceEndAllowed(start, local(2027, 2, 4, 23, 59))).toBe(true)
  })

  it('refuses the day after the limit', () => {
    expect(isRecurrenceEndAllowed(start, local(2027, 2, 5, 0, 0))).toBe(false)
  })
})

describe('computeTrainingOccurrences', () => {
  const start = local(2026, 11, 4) // a Wednesday

  it('weekly: one copy per week, original excluded, end day inclusive', () => {
    const dates = computeTrainingOccurrences(start, 'weekly', local(2026, 11, 25, 0, 0))
    expect(dates).toEqual([local(2026, 11, 11), local(2026, 11, 18), local(2026, 11, 25)])
  })

  it('biweekly: one copy every two weeks', () => {
    const dates = computeTrainingOccurrences(start, 'biweekly', local(2026, 12, 10, 0, 0))
    expect(dates).toEqual([local(2026, 11, 18), local(2026, 12, 2)])
  })

  it('daily: one copy per day', () => {
    const dates = computeTrainingOccurrences(start, 'daily', local(2026, 11, 7, 0, 0))
    expect(dates).toEqual([local(2026, 11, 5), local(2026, 11, 6), local(2026, 11, 7)])
  })

  it('returns nothing when the end is before the first copy', () => {
    expect(computeTrainingOccurrences(start, 'weekly', local(2026, 11, 10, 0, 0))).toEqual([])
    expect(computeTrainingOccurrences(start, 'weekly', start)).toEqual([])
  })

  it('keeps the wall-clock time across the end-of-October daylight-saving change', () => {
    const dates = computeTrainingOccurrences(local(2026, 10, 21), 'weekly', local(2026, 11, 4, 0, 0))
    expect(dates).toHaveLength(2)
    expect(dates.map((date) => [date.getHours(), date.getMinutes()])).toEqual([
      [18, 30],
      [18, 30],
    ])
  })
})
