import type { SupabaseClient } from '@supabase/supabase-js'
import type { Vote, VoteCategoryId } from '@domain/entities/vote'
import type { VoteRepository } from '@domain/repositories/vote-repository'
import type { VoteRow } from '../dto/vote-row'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toVote, toVoteRow } from '../mappers/vote-mapper'

// `public.votes` — table + RLS from
// supabase/migrations/20260916171955_player_vote_schema.sql
// (votes_select_own / votes_insert_cast / votes_update_cast). Mirrors
// AttendanceRecordRepositoryImpl's upsert()/select() shape.
export class VoteRepositoryImpl implements VoteRepository {
  constructor(private supabaseClient: SupabaseClient) {}

  async upsert(vote: Omit<Vote, 'id'>): Promise<Vote> {
    const { data, error } = await this.supabaseClient
      .from('votes')
      .upsert(toVoteRow(vote), { onConflict: 'convocation_id,category_id,voter_id' })
      .select()
      .single<VoteRow>()

    if (error) throw mapSupabaseError(error)

    return toVote(data as VoteRow)
  }

  async findMyVote(convocationId: string, categoryId: VoteCategoryId, voterId: string): Promise<Vote | null> {
    const { data, error } = await this.supabaseClient
      .from('votes')
      .select('id, convocation_id, category_id, voter_id, candidate_id, voted_at')
      .eq('convocation_id', convocationId)
      .eq('category_id', categoryId)
      .eq('voter_id', voterId)
      .maybeSingle<VoteRow>()

    if (error) throw mapSupabaseError(error)

    return data ? toVote(data) : null
  }
}
