import type { PresenceEntry } from '../../entities/leaderboard'
import { rankPresenceLeaderboard } from '../../policies/presence-leaderboard-rules'
import type { LeaderboardRepository } from '../../repositories/leaderboard-repository'

export interface GetTeamPresenceLeaderboardInput {
  teamId: string
}

// Presence tab read — separate from GetTeamLeaderboardUseCase so the extra
// request only fires when the tab is opened.
export class GetTeamPresenceLeaderboardUseCase {
  constructor(private readonly leaderboardRepository: LeaderboardRepository) {}

  async execute(input: GetTeamPresenceLeaderboardInput): Promise<PresenceEntry[]> {
    return rankPresenceLeaderboard(await this.leaderboardRepository.listTeamPresenceCounts(input.teamId))
  }
}
