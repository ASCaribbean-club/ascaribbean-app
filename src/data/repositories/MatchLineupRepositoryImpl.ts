import type { SupabaseClient } from '@supabase/supabase-js'
import type { Formation, LineupJerseyNumbers, LineupSlots, MatchLineup } from '@domain/entities/match-lineup'
import type { MatchLineupRepository } from '@domain/repositories/match-lineup-repository'
import type { LineupDefaultJerseyNumberDto, MatchLineupSlotDto } from '@data/dto/match-lineup-dto'
import { mapSupabaseError } from '@data/errors/map-supabase-error'
import { toDefaultJerseyNumbers, toMatchLineup, toSaveSlotsPayload } from '@data/mappers/match-lineup-mapper'

// `public.match_lineups` / `public.match_lineup_slots` —
// supabase/migrations/20261001075331_match_lineup.sql.
export class MatchLineupRepositoryImpl implements MatchLineupRepository {
  constructor(private readonly client: SupabaseClient) {}

  // get_match_lineup — SECURITY DEFINER, returns names in one round trip and
  // nothing at all for a player before the RDV (AC-MC-09, server clock).
  async findByConvocationId(convocationId: string): Promise<MatchLineup | null> {
    const { data, error } = await this.client.rpc('get_match_lineup', { p_convocation_id: convocationId })

    if (error) throw mapSupabaseError(error)

    return toMatchLineup(convocationId, (data ?? []) as MatchLineupSlotDto[])
  }

  // save_match_lineup — SECURITY INVOKER, so the write RLS policies
  // ('match_lineup:write') apply; header upsert + slot replacement are one
  // atomic call (AC-MC-08).
  async save(convocationId: string, formation: Formation, slots: LineupSlots, jerseyNumbers: LineupJerseyNumbers): Promise<void> {
    const { error } = await this.client.rpc('save_match_lineup', {
      p_convocation_id: convocationId,
      p_formation: formation,
      p_slots: toSaveSlotsPayload(slots, jerseyNumbers),
    })

    if (error) throw mapSupabaseError(error)
  }

  // get_lineup_default_jersey_numbers — SECURITY DEFINER, restricted to the
  // lineup writer ('match_lineup:write'); returns (user_id, jersey_number)
  // only, for the membership of the season containing the convocation's date
  // (PO-MC-16). Mirrors getPrefilledJerseyNumber.
  async listDefaultJerseyNumbers(convocationId: string): Promise<Record<string, number>> {
    const { data, error } = await this.client.rpc('get_lineup_default_jersey_numbers', { p_convocation_id: convocationId })

    if (error) throw mapSupabaseError(error)

    return toDefaultJerseyNumbers((data ?? []) as LineupDefaultJerseyNumberDto[])
  }
}
