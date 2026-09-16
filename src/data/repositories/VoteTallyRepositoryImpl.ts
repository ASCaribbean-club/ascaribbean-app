import type { SupabaseClient } from '@supabase/supabase-js'
import type { VoteCategoryId, VoteTally } from '@domain/entities/vote'
import type { VoteTallyRepository } from '@domain/repositories/vote-tally-repository'
import type { VoteTallyDto } from '../dto/vote-tally-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toVoteTally } from '../mappers/vote-tally-mapper'

// AC-PV-10 is a database-shape guarantee first, an application-code one
// second — same lesson as ConvocationRespondersRepositoryImpl's own
// get_convocation_responders RPC. get_vote_tally() (see
// supabase/migrations/20260916171955_player_vote_schema.sql) aggregates
// server-side; this class never fetches individual vote rows.
export class VoteTallyRepositoryImpl implements VoteTallyRepository {
  constructor(private supabaseClient: SupabaseClient) {}

  async getTally(convocationId: string, categoryId: VoteCategoryId): Promise<VoteTally> {
    const { data, error } = await this.supabaseClient.rpc('get_vote_tally', {
      p_convocation_id: convocationId,
      p_category_id: categoryId,
    })

    if (error) throw mapSupabaseError(error)

    return toVoteTally(convocationId, categoryId, (data ?? []) as VoteTallyDto[])
  }
}
