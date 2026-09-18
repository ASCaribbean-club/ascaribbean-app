import { describe, expect, it } from 'vitest'
import type { Season } from '../entities/season'
import { isCurrentSeason, seasonStatus } from './season-scope'

function seasonWith(startDate: string, endDate: string): Season {
  return { id: 's1', label: '2026-2027', startDate, endDate, cotisationAmount: null }
}

describe('isCurrentSeason', () => {
  it('returns true when now falls strictly between start and end', () => {
    const season = seasonWith('2026-08-01', '2027-06-30')
    expect(isCurrentSeason(season, new Date('2026-12-15'))).toBe(true)
  })

  it('returns true on the start date boundary (inclusive)', () => {
    const season = seasonWith('2026-08-01', '2027-06-30')
    expect(isCurrentSeason(season, new Date('2026-08-01'))).toBe(true)
  })

  it('returns true on the end date boundary (inclusive)', () => {
    const season = seasonWith('2026-08-01', '2027-06-30')
    expect(isCurrentSeason(season, new Date('2027-06-30'))).toBe(true)
  })

  it('returns false before the season starts', () => {
    const season = seasonWith('2026-08-01', '2027-06-30')
    expect(isCurrentSeason(season, new Date('2026-07-31'))).toBe(false)
  })

  it('returns false after the season ends', () => {
    const season = seasonWith('2026-08-01', '2027-06-30')
    expect(isCurrentSeason(season, new Date('2027-07-01'))).toBe(false)
  })
})

// specs/web-seasons.md §2.2/AC-WS-12 — every branch of the 3-state
// predicate, including the boundary case the spec calls out explicitly
// (§2.3c): end_date === today must read "current", not "ended".
describe('seasonStatus', () => {
  it('returns "current" when now falls strictly between start and end', () => {
    const season = seasonWith('2026-08-01', '2027-06-30')
    expect(seasonStatus(season, new Date('2026-12-15'))).toBe('current')
  })

  it('returns "current" on the start date boundary (inclusive)', () => {
    const season = seasonWith('2026-08-01', '2027-06-30')
    expect(seasonStatus(season, new Date('2026-08-01'))).toBe('current')
  })

  // §2.3c — the boundary case this feature exists to get right: a season
  // ending today is still modifiable ("current"), matching
  // season_range's '[]' inclusive bound and isCurrentSeason's own `now <=
  // end`. Getting this wrong would create a day where current_season()
  // still resolves the season while this screen already called it "ended".
  it('returns "current" on the end date boundary (inclusive) — not "ended"', () => {
    const season = seasonWith('2026-08-01', '2027-06-30')
    expect(seasonStatus(season, new Date('2027-06-30'))).toBe('current')
  })

  it('returns "upcoming" strictly before the season starts', () => {
    const season = seasonWith('2026-08-01', '2027-06-30')
    expect(seasonStatus(season, new Date('2026-07-31'))).toBe('upcoming')
  })

  it('returns "upcoming" for a season created far in the future — the normal result of creating next season early (§2.2)', () => {
    const season = seasonWith('2027-08-01', '2028-06-30')
    expect(seasonStatus(season, new Date('2026-09-17'))).toBe('upcoming')
  })

  it('returns "ended" the day immediately after end_date', () => {
    const season = seasonWith('2026-08-01', '2027-06-30')
    expect(seasonStatus(season, new Date('2027-07-01'))).toBe('ended')
  })

  it('returns "ended" long after the season is over', () => {
    const season = seasonWith('2024-08-01', '2025-06-30')
    expect(seasonStatus(season, new Date('2026-09-17'))).toBe('ended')
  })

  // Uses end_date, not start_date, to decide "ended" vs "current" (§2.3a):
  // a season already underway (past start_date) is still "current", never
  // "ended", as long as its end_date hasn't passed yet.
  it('a season already underway is "current", not "ended", even though start_date is in the past', () => {
    const season = seasonWith('2026-08-01', '2027-06-30')
    expect(seasonStatus(season, new Date('2026-09-17'))).toBe('current')
  })
})
