import type { SupabaseClient } from '@supabase/supabase-js'
import type { ClubOverview } from '@domain/entities/club-overview'
import type { ClubOverviewRepository } from '@domain/repositories/club-overview-repository'
import type { ClubOverviewDto } from '../dto/club-overview-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toClubOverview } from '../mappers/club-overview-mapper'

// `get_club_overview` — supabase/migrations/20261003123356_get_club_overview_rpc.sql.
// The function's own role check (authorized-officer or admin, else 42501) is
// the real boundary; memberships is never read row by row from the client.
export class ClubOverviewRepositoryImpl implements ClubOverviewRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getOverview(): Promise<ClubOverview> {
    const { data, error } = await this.client.rpc('get_club_overview').single<ClubOverviewDto>()

    if (error) throw mapSupabaseError(error)
    return toClubOverview(data)
  }
}
