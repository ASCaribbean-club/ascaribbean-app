import { describe, expect, it } from 'vitest'
import { computeRecentForm, sumGoals, type RecordedMatchResult } from './team-form-rules'

function matchOn(date: string, goalsFor: number, goalsAgainst: number): RecordedMatchResult {
  return { date, goalsFor, goalsAgainst }
}

describe('computeRecentForm', () => {
  it('returns outcomes ordered oldest to newest', () => {
    const matches = [matchOn('2026-09-10', 1, 2), matchOn('2026-09-01', 2, 0), matchOn('2026-09-20', 1, 1)]

    expect(computeRecentForm(matches, 5)).toEqual(['win', 'loss', 'draw'])
  })

  it('keeps only the most recent N matches', () => {
    const matches = [
      matchOn('2026-08-01', 0, 3), // loss, dropped
      matchOn('2026-09-01', 2, 0), // win
      matchOn('2026-09-08', 1, 1), // draw
    ]

    expect(computeRecentForm(matches, 2)).toEqual(['win', 'draw'])
  })

  it('returns an empty array when no match has a recorded score', () => {
    expect(computeRecentForm([], 5)).toEqual([])
  })
})

describe('sumGoals', () => {
  it('sums goalsFor/goalsAgainst across every match, regardless of recentMatchCount', () => {
    const matches = [matchOn('2026-09-01', 2, 1), matchOn('2026-09-08', 0, 0), matchOn('2026-09-15', 3, 2)]

    expect(sumGoals(matches)).toEqual({ goalsFor: 5, goalsAgainst: 3 })
  })

  it('returns zeros when no match has a recorded score', () => {
    expect(sumGoals([])).toEqual({ goalsFor: 0, goalsAgainst: 0 })
  })
})
