import { describe, expect, it } from 'vitest'
import { formatCooldownNotice, formatLongReminderDate, formatReminderAge, formatReminderState } from './dues-reminder-labels'

// Local-time instants so the calendar-day arithmetic is timezone independent.
const now = new Date(2026, 9, 14, 10, 0)
const daysAgo = (days: number, hour = 9) => new Date(2026, 9, 14 - days, hour, 0).toISOString()

describe('formatReminderAge', () => {
  it('reads today, yesterday, then a number of days', () => {
    expect(formatReminderAge(0)).toBe("aujourd'hui")
    expect(formatReminderAge(1)).toBe('hier')
    expect(formatReminderAge(9)).toBe('il y a 9 j')
  })
})

describe('formatReminderState', () => {
  it('reads "Jamais relancé" with no reminder', () => {
    expect(formatReminderState(0, null, now)).toBe('Jamais relancé')
  })

  it('reads the count and the age of the last reminder', () => {
    expect(formatReminderState(2, daysAgo(9), now)).toBe('2 relances · dernière il y a 9 j')
  })

  it('uses the singular for one reminder', () => {
    expect(formatReminderState(1, daysAgo(0, 8), now)).toBe('1 relance · dernière aujourd\'hui')
  })

  it('counts calendar days, not 24 h spans: 23:00 the day before reads "hier"', () => {
    expect(formatReminderState(1, new Date(2026, 9, 13, 23, 0).toISOString(), now)).toBe('1 relance · dernière hier')
  })
})

describe('formatCooldownNotice', () => {
  it('names the age and the first date a new reminder is possible again', () => {
    const notice = formatCooldownNotice(daysAgo(3), now)
    expect(notice.startsWith('Relancé il y a 3 j · prochaine relance le ')).toBe(true)
    expect(notice).toContain('18')
  })

  it('reads "aujourd\'hui" for a reminder sent today', () => {
    expect(formatCooldownNotice(daysAgo(0, 8), now).startsWith("Relancé aujourd'hui · prochaine relance le ")).toBe(true)
  })
})

describe('formatLongReminderDate', () => {
  it('writes the day, the month in full and the year', () => {
    expect(formatLongReminderDate(new Date(2026, 9, 5, 14, 0).toISOString())).toBe('5 octobre 2026')
  })
})
