import { describe, expect, it } from 'vitest'
import type { PresencePlayerCounts } from '../entities/leaderboard'
import { percentage, rankPresenceLeaderboard } from './presence-leaderboard-rules'

const player = (userId: string, displayName: string, presentCount: number, extra: Partial<PresencePlayerCounts> = {}): PresencePlayerCounts => ({
  userId,
  displayName,
  validatedCount: 10,
  presentCount,
  convokedCount: 10,
  respondedCount: 5,
  ...extra,
})

describe('percentage', () => {
  it('rounds to a whole percent', () => expect(percentage(2, 3)).toBe(67))
  it('is null when the denominator is 0', () => expect(percentage(0, 0)).toBeNull())
})

describe('rankPresenceLeaderboard', () => {
  it('shares the rank on ties and skips the next one', () => {
    const ranked = rankPresenceLeaderboard([player('a', 'Ana', 9), player('b', 'Bob', 7), player('c', 'Cleo', 7), player('d', 'Dan', 3)])
    expect(ranked.map((entry) => entry.rank)).toEqual([1, 2, 2, 4])
  })

  it('keeps zero-presence players, muted, with a null attendance rate when nothing was validated', () => {
    const [entry] = rankPresenceLeaderboard([player('a', 'Ana', 0, { validatedCount: 0 })])
    expect(entry).toMatchObject({ rank: 1, value: 0, isMuted: true, attendanceRate: null })
  })

  it('computes attendance and response rates', () => {
    const [entry] = rankPresenceLeaderboard([player('a', 'Ana', 8, { validatedCount: 10, convokedCount: 4, respondedCount: 3 })])
    expect(entry).toMatchObject({ attendanceRate: 80, responseRate: 75 })
  })
})
