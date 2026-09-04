import type { SupabaseClient } from '@supabase/supabase-js'
import type { CoachRepository, TeamCoach } from '@domain/repositories/coach-repository'
import type { CoachDto } from '@data/dto/coach-dto'
import { mapSupabaseError } from '@data/errors/map-supabase-error'
import { toTeamCoach } from '@data/mappers/coach-mapper'

export class CoachRepositoryImpl implements CoachRepository {
  constructor(private readonly client: SupabaseClient) {}

  // get_team_coaches (supabase/migrations/20260904083306_profile_team_
  // coaches.sql) is the actual authorization boundary here — an out-of-scope
  // teamId (caller isn't a member) resolves to an empty array server-side,
  // not an error, matching listForConvocation's own "no existence leak" shape.
  async listForTeam(teamId: string): Promise<TeamCoach[]> {
    const { data, error } = await this.client.rpc('get_team_coaches', { p_team_id: teamId })

    if (error) throw mapSupabaseError(error)
    return ((data ?? []) as CoachDto[]).map(toTeamCoach)
  }
}
