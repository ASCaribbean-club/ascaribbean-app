import { describe, expect, it } from 'vitest'
import { userStatus } from './user-status'

describe('userStatus', () => {
  it('is "invited" when charterAcceptedAt is null', () => {
    expect(userStatus(null)).toBe('invited')
  })

  // AC-WU-08 — a boundary case exactly like isNewsVisible's "at exactly
  // now": any non-null Date, including one at the exact current instant, is
  // enough — this predicate never compares the date to `now`, it only
  // checks nullity.
  it('is "active" for any non-null date, including one exactly at the current instant', () => {
    const now = new Date('2026-09-18T12:00:00.000Z')
    expect(userStatus(now)).toBe('active')
  })

  it('is "active" for a date far in the past', () => {
    expect(userStatus(new Date('2020-01-01T00:00:00.000Z'))).toBe('active')
  })
})
