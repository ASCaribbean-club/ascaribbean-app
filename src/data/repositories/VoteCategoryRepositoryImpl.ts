import type { SupabaseClient } from '@supabase/supabase-js'
import type { VoteCategory, VoteCategoryId } from '@domain/entities/vote'
import type { VoteCategoryRepository } from '@domain/repositories/vote-category-repository'
import type { VoteCategoryRow } from '../dto/vote-category-row'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toVoteCategory } from '../mappers/vote-category-mapper'

// `public.vote_categories` — reference table, read-only for any
// authenticated member (supabase/migrations/20260916172217_vote_categories.sql,
// vote_categories_select_authenticated).
export class VoteCategoryRepositoryImpl implements VoteCategoryRepository {
  constructor(private supabaseClient: SupabaseClient) {}

  async findById(id: VoteCategoryId): Promise<VoteCategory | null> {
    const { data, error } = await this.supabaseClient
      .from('vote_categories')
      .select('id, label')
      .eq('id', id)
      .maybeSingle<VoteCategoryRow>()

    if (error) throw mapSupabaseError(error)

    return data ? toVoteCategory(data) : null
  }
}
