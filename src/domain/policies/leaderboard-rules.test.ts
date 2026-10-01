import { describe, expect, it } from 'vitest'
import type { LeaderboardPlayerCounts } from '../entities/leaderboard'
import { metricValue, rankLeaderboard } from './leaderboard-rules'

function player(userId: string, displayName: string, goalsCount = 0, yellowCount = 0, redCount = 0): LeaderboardPlayerCounts {
  return { userId, displayName, goalsCount, yellowCount, redCount }
}

describe('metricValue', () => {
  it('reads the counter matching the metric', () => {
    const p = player('a', 'A', 1, 2, 3)
    expect(metricValue(p, 'goals')).toBe(1)
    expect(metricValue(p, 'yellow')).toBe(2)
    expect(metricValue(p, 'red')).toBe(3)
  })
})

describe('rankLeaderboard', () => {
  it('uses standard competition ranks: 9, 7, 7, 3 -> 1, 2, 2, 4', () => {
    const entries = rankLeaderboard([player('a', 'A', 3), player('b', 'B', 7), player('c', 'C', 9), player('d', 'D', 7)], 'goals')

    expect(entries.map((e) => [e.userId, e.rank])).toEqual([
      ['c', 1],
      ['b', 2],
      ['d', 2],
      ['a', 4],
    ])
  })

  it('includes zero players, muted, sharing the next rank', () => {
    const entries = rankLeaderboard([player('a', 'A', 2), player('b', 'B'), player('c', 'C')], 'goals')

    expect(entries.map((e) => [e.rank, e.isMuted])).toEqual([
      [1, false],
      [2, true],
      [2, true],
    ])
  })

  it('ranks everyone 1 when nobody has a value', () => {
    const entries = rankLeaderboard([player('a', 'A'), player('b', 'B')], 'red')

    expect(entries.map((e) => e.rank)).toEqual([1, 1])
    expect(entries.every((e) => e.isMuted && e.value === 0)).toBe(true)
  })

  it('orders ties alphabetically, accent and case insensitive, without changing rank', () => {
    const entries = rankLeaderboard([player('1', 'zoe', 1), player('2', 'Émile', 1), player('3', 'adam', 1)], 'goals')

    expect(entries.map((e) => e.displayName)).toEqual(['adam', 'Émile', 'zoe'])
    expect(entries.map((e) => e.rank)).toEqual([1, 1, 1])
  })

  it('falls back to userId for identical names, deterministically', () => {
    const forward = rankLeaderboard([player('b', 'Same', 1), player('a', 'Same', 1)], 'goals')
    const reversed = rankLeaderboard([player('a', 'Same', 1), player('b', 'Same', 1)], 'goals')

    expect(forward.map((e) => e.userId)).toEqual(['a', 'b'])
    expect(reversed.map((e) => e.userId)).toEqual(['a', 'b'])
  })

  it('ranks each metric independently and keeps all counters on each entry', () => {
    const players = [player('a', 'A', 5, 0, 1), player('b', 'B', 1, 4, 0)]

    const yellow = rankLeaderboard(players, 'yellow')

    expect(yellow[0]).toMatchObject({ userId: 'b', rank: 1, value: 4, goalsCount: 1 })
    expect(yellow[1]).toMatchObject({ userId: 'a', rank: 2, isMuted: true })
  })

  it('returns an empty list for an empty roster and does not mutate its input', () => {
    expect(rankLeaderboard([], 'goals')).toEqual([])

    const input = [player('a', 'A', 1), player('b', 'B', 2)]
    rankLeaderboard(input, 'goals')
    expect(input.map((p) => p.userId)).toEqual(['a', 'b'])
  })
})
