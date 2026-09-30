import { describe, expect, it } from 'vitest'
import { toAuditLogDateRange } from './audit-log-date-range'

describe('toAuditLogDateRange', () => {
  it('returns an open range when neither bound is set', () => {
    expect(toAuditLogDateRange(null, null)).toEqual({ from: undefined, to: undefined })
  })

  // Normal, non-DST day (winter, Europe/Paris = UTC+1): 00:00 local on
  // 2026-01-10 is 2026-01-09T23:00:00Z.
  it('resolves a normal winter day to its Europe/Paris midnight, in UTC', () => {
    const range = toAuditLogDateRange('2026-01-10', '2026-01-10')

    expect(range.from).toEqual(new Date('2026-01-09T23:00:00.000Z'))
    // `to` is the EXCLUSIVE start of the day AFTER — 2026-01-11 00:00 Paris.
    expect(range.to).toEqual(new Date('2026-01-10T23:00:00.000Z'))
  })

  // §2.6 — `to` is inclusive from the admin's own perspective: an entry
  // timestamped just before Paris midnight on the chosen end date must be
  // included, one timestamped exactly at (or after) that midnight must not.
  it('includes the whole end date and excludes the instant the next day starts (to-inclusivity)', () => {
    const range = toAuditLogDateRange(null, '2026-01-10')

    const lastInstantOfJan10Paris = new Date('2026-01-10T22:59:59.000Z') // 23:59:59 Paris
    const firstInstantOfJan11Paris = new Date('2026-01-10T23:00:00.000Z') // 00:00:00 Paris

    expect(range.to).toBeDefined()
    expect(lastInstantOfJan10Paris.getTime()).toBeLessThan(range.to!.getTime())
    expect(firstInstantOfJan11Paris.getTime()).toBeGreaterThanOrEqual(range.to!.getTime())
  })

  // DST transition (spring forward, night of 2026-03-28/29, EU last Sunday
  // of March): 2026-03-29 is a 23-hour day in Europe/Paris. A fixed
  // +1h-always offset would get this wrong.
  it('resolves the Europe/Paris midnight of a spring-forward DST day correctly', () => {
    const range = toAuditLogDateRange('2026-03-29', '2026-03-29')

    // 2026-03-29 00:00 Paris (still CET, UTC+1 — the switch to CEST happens
    // later that same night, at 02:00 local).
    expect(range.from).toEqual(new Date('2026-03-28T23:00:00.000Z'))
    // 2026-03-30 00:00 Paris (now CEST, UTC+2 — the switch has already
    // happened).
    expect(range.to).toEqual(new Date('2026-03-29T22:00:00.000Z'))
  })

  it('produces a 23-hour range for the spring-forward DST day, not 24', () => {
    const range = toAuditLogDateRange('2026-03-29', '2026-03-29')

    const durationHours = (range.to!.getTime() - range.from!.getTime()) / (60 * 60 * 1000)
    expect(durationHours).toBe(23)
  })

  it('produces a 25-hour range for the fall-back DST day (2026-10-25, EU last Sunday of October)', () => {
    const range = toAuditLogDateRange('2026-10-25', '2026-10-25')

    const durationHours = (range.to!.getTime() - range.from!.getTime()) / (60 * 60 * 1000)
    expect(durationHours).toBe(25)
  })

  it('leaves the `to` bound open when only `from` is set', () => {
    const range = toAuditLogDateRange('2026-01-10', null)

    expect(range.from).toEqual(new Date('2026-01-09T23:00:00.000Z'))
    expect(range.to).toBeUndefined()
  })
})
