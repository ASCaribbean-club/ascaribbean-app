import type { SupabaseClient } from '@supabase/supabase-js'
import type { Team } from '@domain/entities/team'
import type { TeamRepository } from '@domain/repositories/team-repository'
import type { TeamRow } from '../dto/team-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toTeam } from '../mappers/team-mapper'

export class TeamRepositoryImpl implements TeamRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async findByIds(ids: string[]): Promise<Team[]> {
    const { data, error } = await this.client
      .from('teams')
      .select('id, name, section_id, season_id')
      .in('id', ids)
      .returns<TeamRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toTeam)
  }

  // For now we will count all active membership's user assigned to the team
  async countActiveMembers(_teamId: string): Promise<number> {
    const { data, error } = await this.client
      .from('team_active_headcount')
      .select('headcount')
      .eq('team_id', _teamId)
      .single()

    if (error) throw mapSupabaseError(error)
    return data.headcount ?? 0
  }
}
