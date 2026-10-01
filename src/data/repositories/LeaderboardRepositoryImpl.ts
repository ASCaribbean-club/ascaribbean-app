import type { SupabaseClient } from '@supabase/supabase-js'
import type { LeaderboardPlayerCounts } from '@domain/entities/leaderboard'
import type { LeaderboardRepository } from '@domain/repositories/leaderboard-repository'
import type { TeamLeaderboardPlayerDto } from '@data/dto/team-leaderboard-dto'
import { mapSupabaseError } from '@data/errors/map-supabase-error'
import { toLeaderboardPlayerCounts } from '@data/mappers/team-leaderboard-mapper'

// `get_team_leaderboard` — supabase/migrations/20261001161553_team_leaderboard_rpc.sql.
// The function's own is_team_member predicate is the real boundary.
export class LeaderboardRepositoryImpl implements LeaderboardRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listTeamPlayerCounts(teamId: string): Promise<LeaderboardPlayerCounts[]> {
    const { data, error } = await this.client.rpc('get_team_leaderboard', { p_team_id: teamId })

    if (error) throw mapSupabaseError(error)
    return ((data ?? []) as TeamLeaderboardPlayerDto[]).map(toLeaderboardPlayerCounts)
  }
}
