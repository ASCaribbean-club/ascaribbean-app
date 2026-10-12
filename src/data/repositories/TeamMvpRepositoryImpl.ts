import type { SupabaseClient } from '@supabase/supabase-js'
import type { VoteCategoryId } from '@domain/entities/vote'
import type { TeamMvpRepository } from '@domain/repositories/team-mvp-repository'
import type { TeamMvpDto } from '../dto/team-mvp-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toMvpUserIds } from '../mappers/team-mvp-mapper'

// get_team_mvp aggregates server-side (supabase/migrations/
// 20261012093753_get_team_mvp_rpc.sql); this class never reads vote rows.
export class TeamMvpRepositoryImpl implements TeamMvpRepository {
  constructor(private supabaseClient: SupabaseClient) {}

  async getCurrentMvpIds(teamId: string, categoryId: VoteCategoryId): Promise<string[]> {
    const { data, error } = await this.supabaseClient.rpc('get_team_mvp', {
      p_team_id: teamId,
      p_category_id: categoryId,
    })

    if (error) throw mapSupabaseError(error)

    return toMvpUserIds((data ?? []) as TeamMvpDto[])
  }
}
