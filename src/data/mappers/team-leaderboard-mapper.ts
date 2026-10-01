import type { LeaderboardPlayerCounts } from '@domain/entities/leaderboard'
import type { TeamLeaderboardPlayerDto } from '@data/dto/team-leaderboard-dto'

export function toLeaderboardPlayerCounts(dto: TeamLeaderboardPlayerDto): LeaderboardPlayerCounts {
  return {
    userId: dto.user_id,
    displayName: dto.full_name,
    goalsCount: dto.goals_count,
    yellowCount: dto.yellow_count,
    redCount: dto.red_count,
  }
}
