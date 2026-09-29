import type { SupabaseClient } from '@supabase/supabase-js'
import type { TeamRosterPlayer, TeamRosterRepository } from '@domain/repositories/team-roster-repository'
import type { TeamRosterPlayerDto } from '@data/dto/team-roster-dto'
import { mapSupabaseError } from '@data/errors/map-supabase-error'
import { toTeamRosterPlayer } from '@data/mappers/team-roster-mapper'

// `get_team_roster` — supabase/migrations/<timestamp>_coach_team_stats_get_
// team_roster.sql. Same SECURITY DEFINER shape as CoachRepositoryImpl.listForTeam
// (get_team_coaches): the RPC's own is_coach_of_team/is_admin EXISTS check is
// the real authorization boundary, not this class.
export class TeamRosterRepositoryImpl implements TeamRosterRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listPlayers(teamId: string): Promise<TeamRosterPlayer[]> {
    const { data, error } = await this.client.rpc('get_team_roster', { p_team_id: teamId })

    if (error) throw mapSupabaseError(error)
    return ((data ?? []) as TeamRosterPlayerDto[]).map(toTeamRosterPlayer)
  }
}
