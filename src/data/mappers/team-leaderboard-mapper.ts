import type { LeaderboardPlayerCounts, PresencePlayerCounts, TeamLegacyPoints } from '@domain/entities/leaderboard'
import type { TeamLeaderboardPlayerDto, TeamLegacyLeaderboardPlayerDto, TeamPresenceLeaderboardPlayerDto } from '@data/dto/team-leaderboard-dto'

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

// The RPC repeats `is_configured` on every row; no rows (a team out of scope, or
// no current season) reads as "configured" so nothing is flagged for a ranking
// that is simply empty.
export function toTeamLegacyPoints(dtos: TeamLegacyLeaderboardPlayerDto[]): TeamLegacyPoints {
  return {
    isConfigured: dtos.length === 0 ? true : dtos[0].is_configured,
    players: dtos.map((dto) => ({ userId: dto.user_id, displayName: dto.full_name, points: dto.points })),
  }
}
