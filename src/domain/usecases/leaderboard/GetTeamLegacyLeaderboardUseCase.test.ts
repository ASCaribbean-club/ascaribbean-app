import { describe, expect, it, vi } from 'vitest'
import type { LeaderboardRepository } from '../../repositories/leaderboard-repository'
import { GetTeamLegacyLeaderboardUseCase } from './GetTeamLegacyLeaderboardUseCase'

function repository(listTeamLegacyPoints: LeaderboardRepository['listTeamLegacyPoints']): LeaderboardRepository {
  return { listTeamPlayerCounts: async () => [], listTeamPresenceCounts: async () => [], listTeamLegacyPoints }
}

describe('GetTeamLegacyLeaderboardUseCase', () => {
  it('reads the repository once for the team and ranks by points', async () => {
    const listTeamLegacyPoints = vi.fn(async () => ({
      isConfigured: true,
      players: [
        { userId: 'a', displayName: 'Alice', points: 10 },
        { userId: 'b', displayName: 'Bruno', points: 40 },
      ],
    }))

    const result = await new GetTeamLegacyLeaderboardUseCase(repository(listTeamLegacyPoints)).execute({ teamId: 'team-1' })

    expect(listTeamLegacyPoints).toHaveBeenCalledExactlyOnceWith('team-1')
    expect(result.isConfigured).toBe(true)
    expect(result.players.map((p) => [p.userId, p.rank])).toEqual([['b', 1], ['a', 2]])
  })

  it('passes the not-configured flag through', async () => {
    const result = await new GetTeamLegacyLeaderboardUseCase(
      repository(async () => ({ isConfigured: false, players: [{ userId: 'a', displayName: 'Alice', points: 0 }] })),
    ).execute({ teamId: 't' })

    expect(result.isConfigured).toBe(false)
  })
})
