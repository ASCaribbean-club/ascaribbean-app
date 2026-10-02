import type { LeaderboardPlayerCounts, PresencePlayerCounts } from '@domain/entities/leaderboard'
import type { TeamLeaderboardPlayerDto, TeamPresenceLeaderboardPlayerDto } from '@data/dto/team-leaderboard-dto'

export function toLeaderboardPlayerCounts(dto: TeamLeaderboardPlayerDto): LeaderboardPlayerCounts {
  return {
    userId: dto.user_id,
    displayName: dto.full_name,
    goalsCount: dto.goals_count,
    yellowCount: dto.yellow_count,
    redCount: dto.red_count,
  }
}

export function toPresencePlayerCounts(dto: TeamPresenceLeaderboardPlayerDto): PresencePlayerCounts {
  return {
    userId: dto.user_id,
    displayName: dto.full_name,
    validatedCount: dto.validated_count,
    presentCount: dto.present_count,
    convokedCount: dto.convoked_count,
    respondedCount: dto.responded_count,
  }
}
