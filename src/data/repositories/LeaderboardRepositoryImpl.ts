import type { SupabaseClient } from '@supabase/supabase-js'
import type { LeaderboardPlayerCounts, PresencePlayerCounts, TeamLegacyPoints } from '@domain/entities/leaderboard'
import type { LeaderboardRepository } from '@domain/repositories/leaderboard-repository'
import type { TeamLeaderboardPlayerDto, TeamLegacyLeaderboardPlayerDto, TeamPresenceLeaderboardPlayerDto } from '@data/dto/team-leaderboard-dto'
import { mapSupabaseError } from '@data/errors/map-supabase-error'
import { toLeaderboardPlayerCounts, toPresencePlayerCounts, toTeamLegacyPoints } from '@data/mappers/team-leaderboard-mapper'

// `get_team_leaderboard` — supabase/migrations/20261001161553_team_leaderboard_rpc.sql.
// The function's own is_team_member predicate is the real boundary.
export class LeaderboardRepositoryImpl implements LeaderboardRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listTeamPlayerCounts(teamId: string): Promise<LeaderboardPlayerCounts[]> {
    const { data, error } = await this.client.rpc('get_team_leaderboard', { p_team_id: teamId })

    if (error) throw mapSupabaseError(error)
    return ((data ?? []) as TeamLeaderboardPlayerDto[]).map(toLeaderboardPlayerCounts)
  }

  // `get_team_presence_leaderboard` — supabase/migrations/20261002174659_team_presence_leaderboard_rpc.sql.
  async listTeamPresenceCounts(teamId: string): Promise<PresencePlayerCounts[]> {
    const { data, error } = await this.client.rpc('get_team_presence_leaderboard', { p_team_id: teamId })

    if (error) throw mapSupabaseError(error)
    return ((data ?? []) as TeamPresenceLeaderboardPlayerDto[]).map(toPresencePlayerCounts)
  }

  // `get_team_legacy_leaderboard` — supabase/migrations/20261014143219_team_legacy_leaderboard_rpc.sql.
  async listTeamLegacyPoints(teamId: string): Promise<TeamLegacyPoints> {
    const { data, error } = await this.client.rpc('get_team_legacy_leaderboard', { p_team_id: teamId })

    if (error) throw mapSupabaseError(error)
    return toTeamLegacyPoints((data ?? []) as TeamLegacyLeaderboardPlayerDto[])
  }
}
