import type { LegacyRankedPlayer } from '../../entities/leaderboard'
import { rankLegacyLeaderboard } from '../../policies/legacy-leaderboard-rules'
import type { LeaderboardRepository } from '../../repositories/leaderboard-repository'

export interface GetTeamLegacyLeaderboardInput {
  teamId: string
}

export interface TeamLegacyLeaderboard {
  isConfigured: boolean
  players: LegacyRankedPlayer[]
}

// ASC Legacy tab read — separate from the goals/cards read so the extra request
// only fires when the tab is opened.
export class GetTeamLegacyLeaderboardUseCase {
  constructor(private readonly leaderboardRepository: LeaderboardRepository) {}

  async execute(input: GetTeamLegacyLeaderboardInput): Promise<TeamLegacyLeaderboard> {
    const { isConfigured, players } = await this.leaderboardRepository.listTeamLegacyPoints(input.teamId)
    return { isConfigured, players: rankLegacyLeaderboard(players) }
  }
}
