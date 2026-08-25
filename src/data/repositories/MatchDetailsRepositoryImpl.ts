import type { SupabaseClient } from '@supabase/supabase-js'
import type { MatchDetails } from '@domain/entities/match-details'
import type { MatchDetailsRepository } from '@domain/repositories/match-details-repository'
import type { MatchDetailsRow } from '../dto/match-details-dto'
import { toMatchDetails, toMatchDetailsRow } from '../mappers/match-details-mapper'

// `public.match_details` — migration
// 20260821091519_convocation_creation_schema.sql (see match-details-dto.ts).
export class MatchDetailsRepositoryImpl implements MatchDetailsRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async upsert(details: MatchDetails): Promise<MatchDetails> {
    // CLAUDE.md §6, "current state" table, not append-only — upsert on
    // `convocation_id` (the primary key), same convention as
    // MeetingDetailsRepositoryImpl.
    const { data, error } = await this.client
      .from('match_details')
      .upsert(toMatchDetailsRow(details), { onConflict: 'convocation_id' })
      .select()
      .single()

    if (error) throw error

    return toMatchDetails(data as MatchDetailsRow)
  }

  async findByConvocationId(convocationId: string): Promise<MatchDetails | null> {
    // `.maybeSingle()`, not `.single()` — a match convocation with no
    // MatchDetails row yet (shouldn't normally happen once creation is
    // wired, but this repository must not throw on it) is a valid `null`.
    const { data, error } = await this.client
      .from('match_details')
      .select()
      .eq('convocation_id', convocationId)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    return toMatchDetails(data as MatchDetailsRow)
  }
}