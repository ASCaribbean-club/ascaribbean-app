import { describe, expect, it } from 'vitest'
import { rankLegacyLeaderboard } from './legacy-leaderboard-rules'

const player = (userId: string, displayName: string, points: number) => ({ userId, displayName, points })

describe('rankLegacyLeaderboard', () => {
  it('ranks by points, highest first', () => {
    const ranked = rankLegacyLeaderboard([player('a', 'Alice', 10), player('b', 'Bruno', 30), player('c', 'Chloé', 20)])
    expect(ranked.map((p) => [p.displayName, p.rank])).toEqual([['Bruno', 1], ['Chloé', 2], ['Alice', 3]])
  })

  it('gives tied players the same rank and skips the next one', () => {
    const ranked = rankLegacyLeaderboard([player('a', 'Alice', 20), player('b', 'Bruno', 20), player('c', 'Chloé', 5)])
    expect(ranked.map((p) => p.rank)).toEqual([1, 1, 3])
  })

  it('orders a tie by name, then by id', () => {
    const ranked = rankLegacyLeaderboard([player('2', 'Alice', 5), player('1', 'Alice', 5), player('3', 'Aaron', 5)])
    expect(ranked.map((p) => p.userId)).toEqual(['3', '1', '2'])
  })

  it('keeps zero-point players, muted, and mutes a negative total too', () => {
    const ranked = rankLegacyLeaderboard([player('a', 'Alice', 0), player('b', 'Bruno', -5), player('c', 'Chloé', 5)])
    expect(ranked.map((p) => [p.displayName, p.isMuted])).toEqual([['Chloé', false], ['Alice', true], ['Bruno', true]])
  })

  it('does not mutate its input and handles an empty roster', () => {
    const input = [player('a', 'Alice', 1), player('b', 'Bruno', 2)]
    rankLegacyLeaderboard(input)
    expect(input[0].userId).toBe('a')
    expect(rankLegacyLeaderboard([])).toEqual([])
  })
})
