import type { SupabaseClient } from '@supabase/supabase-js'
import type { Membership } from '@domain/entities/membership'
import type { MembershipRepository } from '@domain/repositories/membership-repository'
import type { MembershipRow } from '@data/dto/membership-dto'
import { mapSupabaseError } from '@data/errors/map-supabase-error'
import { toMembership } from '@data/mappers/membership-mapper'

export class MembershipRepositoryImpl implements MembershipRepository {
  constructor(private readonly client: SupabaseClient) {}

  // memberships_select_own already scopes this to the caller's own row (or
  // admin) — see supabase/migrations/20260811171754_initial_schema.sql.
  // maybeSingle(), not single(): a member with no row for this season
  // (e.g. not yet registered) is a valid, expected zero-row state.
  async findForUserAndSeason(userId: string, seasonId: string): Promise<Membership | null> {
    const { data, error } = await this.client
      .from('memberships')
      .select('id, user_id, licence_number, status, season_id, valid_until')
      .eq('user_id', userId)
      .eq('season_id', seasonId)
      .maybeSingle<MembershipRow>()

    if (error) throw mapSupabaseError(error)
    return data ? toMembership(data) : null
  }
}
