import { describe, expect, it, vi } from 'vitest'
import type { LeaderboardPlayerCounts } from '../../entities/leaderboard'
import type { LeaderboardRepository } from '../../repositories/leaderboard-repository'
import { GetTeamLeaderboardUseCase } from './GetTeamLeaderboardUseCase'

const players: LeaderboardPlayerCounts[] = [
  { userId: 'a', displayName: 'A', goalsCount: 4, yellowCount: 0, redCount: 0 },
  { userId: 'b', displayName: 'B', goalsCount: 4, yellowCount: 2, redCount: 0 },
  { userId: 'c', displayName: 'C', goalsCount: 0, yellowCount: 1, redCount: 1 },
]

describe('GetTeamLeaderboardUseCase', () => {
  it('reads the repository once for the given team and ranks goals and total cards', async () => {
    const listTeamPlayerCounts = vi.fn(async () => players)
    const useCase = new GetTeamLeaderboardUseCase({ listTeamPlayerCounts, listTeamPresenceCounts: async () => [] } satisfies LeaderboardRepository)

    const result = await useCase.execute({ teamId: 'team-1' })

    expect(listTeamPlayerCounts).toHaveBeenCalledExactlyOnceWith('team-1')
    expect(result.goals.map((e) => [e.userId, e.rank])).toEqual([['a', 1], ['b', 1], ['c', 3]])
    expect(result.cards.map((e) => [e.userId, e.rank, e.value, e.isMuted])).toEqual([['b', 1, 2, false], ['c', 1, 2, false], ['a', 3, 0, true]])
  })

  it('returns empty lists for an empty roster', async () => {
    const useCase = new GetTeamLeaderboardUseCase({ listTeamPlayerCounts: async () => [], listTeamPresenceCounts: async () => [] })

    await expect(useCase.execute({ teamId: 't' })).resolves.toEqual({ goals: [], cards: [] })
  })
})
