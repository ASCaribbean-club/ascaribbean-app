import type { SupabaseClient } from '@supabase/supabase-js'
import type { Formation, LineupSlots, MatchLineup } from '@domain/entities/match-lineup'
import type { MatchLineupRepository } from '@domain/repositories/match-lineup-repository'
import type { MatchLineupSlotDto } from '@data/dto/match-lineup-dto'
import { mapSupabaseError } from '@data/errors/map-supabase-error'
import { toMatchLineup, toSaveSlotsPayload } from '@data/mappers/match-lineup-mapper'

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
  async save(convocationId: string, formation: Formation, slots: LineupSlots): Promise<void> {
    const { error } = await this.client.rpc('save_match_lineup', {
      p_convocation_id: convocationId,
      p_formation: formation,
      p_slots: toSaveSlotsPayload(slots),
    })

    if (error) throw mapSupabaseError(error)
  }
}
