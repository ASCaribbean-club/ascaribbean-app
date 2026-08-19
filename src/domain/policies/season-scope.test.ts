import { describe, expect, it } from 'vitest'
import type { Season } from '../entities/season'
import { isCurrentSeason } from './season-scope'

function seasonWith(startDate: string, endDate: string): Season {
  return { id: 's1', label: '2026-2027', startDate, endDate }
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
