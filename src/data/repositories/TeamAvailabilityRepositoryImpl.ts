import type { SupabaseClient } from '@supabase/supabase-js'
import type { TeamAvailabilityRepository, TeamAvailabilityRow } from '@domain/repositories/team-availability-repository'
import type { TeamAvailabilityDto } from '@data/dto/team-availability-dto'
import { mapSupabaseError } from '@data/errors/map-supabase-error'
import { toTeamAvailabilityRow } from '@data/mappers/team-availability-mapper'

// `get_team_availability` — supabase/migrations/20261001175044_player_unavailability.sql.
// SECURITY DEFINER: the RPC decides coach vs player view and projects the
// status server-side ('availability:read-team'); this class never sees raw
// medical rows when the caller is a player.
export class TeamAvailabilityRepositoryImpl implements TeamAvailabilityRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listForTeam(teamId: string): Promise<TeamAvailabilityRow[]> {
    const { data, error } = await this.client.rpc('get_team_availability', { p_team_id: teamId })

    if (error) throw mapSupabaseError(error)
    return ((data ?? []) as TeamAvailabilityDto[]).map(toTeamAvailabilityRow)
  }
}
