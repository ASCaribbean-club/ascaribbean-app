import { describe, expect, it } from 'vitest'
import type { TeamLeaderboardPlayerDto } from '@data/dto/team-leaderboard-dto'
import { toLeaderboardPlayerCounts } from './team-leaderboard-mapper'

describe('toLeaderboardPlayerCounts', () => {
  it('maps snake_case RPC columns to the domain shape', () => {
    const dto: TeamLeaderboardPlayerDto = { user_id: 'p1', full_name: 'Joueur 1', goals_count: 3, yellow_count: 1, red_count: 0 }

    expect(toLeaderboardPlayerCounts(dto)).toEqual({ userId: 'p1', displayName: 'Joueur 1', goalsCount: 3, yellowCount: 1, redCount: 0 })
  })

  it('keeps zero counters as zero', () => {
    const dto: TeamLeaderboardPlayerDto = { user_id: 'p2', full_name: 'Joueur 2', goals_count: 0, yellow_count: 0, red_count: 0 }

    expect(toLeaderboardPlayerCounts(dto)).toMatchObject({ goalsCount: 0, yellowCount: 0, redCount: 0 })
  })
})
