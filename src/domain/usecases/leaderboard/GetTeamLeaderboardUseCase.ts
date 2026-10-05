import type { TeamLeaderboard } from '../../entities/leaderboard'
import { rankLeaderboard } from '../../policies/leaderboard-rules'
import type { LeaderboardRepository } from '../../repositories/leaderboard-repository'

export interface GetTeamLeaderboardInput {
  teamId: string
}

// specs/mobile-leaderboard.md — one read, the two counter tabs ranked from the
// same counters (one request, not three; AC-LB-06 same counting rule).
export class GetTeamLeaderboardUseCase {
  constructor(private readonly leaderboardRepository: LeaderboardRepository) {}

  async execute(input: GetTeamLeaderboardInput): Promise<TeamLeaderboard> {
    const players = await this.leaderboardRepository.listTeamPlayerCounts(input.teamId)
    return {
      goals: rankLeaderboard(players, 'goals'),
      cards: rankLeaderboard(players, 'cards'),
    }
  }
}
