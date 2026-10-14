import { describe, expect, it } from 'vitest'
import type { TeamLeaderboardPlayerDto } from '@data/dto/team-leaderboard-dto'
import { toLeaderboardPlayerCounts, toTeamLegacyPoints } from './team-leaderboard-mapper'

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

describe('toTeamLegacyPoints', () => {
  it('maps the rows and reads the configured flag', () => {
    expect(
      toTeamLegacyPoints([
        { user_id: 'u1', full_name: 'Alice', points: 30, is_configured: false },
        { user_id: 'u2', full_name: 'Bruno', points: 10, is_configured: false },
      ]),
    ).toEqual({
      isConfigured: false,
      players: [
        { userId: 'u1', displayName: 'Alice', points: 30 },
        { userId: 'u2', displayName: 'Bruno', points: 10 },
      ],
    })
  })
  it('reads an empty result as configured, with no players', () => {
    expect(toTeamLegacyPoints([])).toEqual({ isConfigured: true, players: [] })
  })
})
