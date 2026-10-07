import { describe, expect, it } from 'vitest'
import { clubToday, formatFullDate, formatShortDate } from './club-date'

describe('clubToday', () => {
  it('uses the club timezone (UTC-4), not UTC', () => {
    // 01:30 UTC on the 7th is still the 6th evening in the Antilles.
    expect(clubToday(new Date('2026-10-07T01:30:00.000Z'))).toBe('2026-10-06')
    expect(clubToday(new Date('2026-10-07T04:00:00.000Z'))).toBe('2026-10-07')
    expect(clubToday(new Date('2026-10-07T03:59:59.000Z'))).toBe('2026-10-06')
  })

  it('rolls over the month and the year at club midnight', () => {
    expect(clubToday(new Date('2026-11-01T03:00:00.000Z'))).toBe('2026-10-31')
    expect(clubToday(new Date('2027-01-01T03:59:00.000Z'))).toBe('2026-12-31')
  })
})

describe('date labels', () => {
  it('formats a short day and month', () => {
    expect(formatShortDate('2026-10-04')).toBe('4 oct.')
    expect(formatShortDate('2026-09-28')).toBe('28 sept.')
  })

  it('formats a long date', () => {
    expect(formatFullDate('2026-09-15')).toBe('15 septembre 2026')
  })

  it('returns an unparsable value unchanged', () => {
    expect(formatShortDate('nope')).toBe('nope')
    expect(formatFullDate('nope')).toBe('nope')
  })
})
