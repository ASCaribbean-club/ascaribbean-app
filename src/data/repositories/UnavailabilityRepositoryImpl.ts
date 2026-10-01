import type { SupabaseClient } from '@supabase/supabase-js'
import type { NewUnavailability, Unavailability } from '@domain/entities/unavailability'
import type { UnavailabilityRepository } from '@domain/repositories/unavailability-repository'
import type { TeamRosterPlayerDto } from '@data/dto/team-roster-dto'
import type { UnavailabilityRow } from '@data/dto/unavailability-row'
import { mapSupabaseError } from '@data/errors/map-supabase-error'
import { toUnavailability, toUnavailabilityInsertRow, toUnavailabilityUpdateRow } from '@data/mappers/unavailability-mapper'

// `public.unavailabilities` — supabase/migrations/20261001175044_player_unavailability.sql.
// RLS is the real boundary: select = the person themself or their coach
// ('availability:read-team'), insert/update = their coach ('availability:declare').
// The team list page does NOT read through this class (a teammate has no
// select policy): it uses TeamAvailabilityRepositoryImpl.
export class UnavailabilityRepositoryImpl implements UnavailabilityRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: NewUnavailability): Promise<Unavailability> {
    const { data, error } = await this.client
      .from('unavailabilities')
      .insert(toUnavailabilityInsertRow(input))
      .select()
      .single()

    if (error) throw mapSupabaseError(error)
    return toUnavailability(data as UnavailabilityRow)
  }

  async update(u: Unavailability): Promise<Unavailability> {
    const { data, error } = await this.client
      .from('unavailabilities')
      .update(toUnavailabilityUpdateRow(u))
      .eq('id', u.id)
      .select()
      .single()

    if (error) throw mapSupabaseError(error)
    return toUnavailability(data as UnavailabilityRow)
  }

  async findByUser(userId: string): Promise<Unavailability[]> {
    const { data, error } = await this.client
      .from('unavailabilities')
      .select('*')
      .eq('user_id', userId)
      .order('starts_on', { ascending: false })

    if (error) throw mapSupabaseError(error)
    return ((data ?? []) as UnavailabilityRow[]).map(toUnavailability)
  }

  // Unavailability has no teamId (PO-PU-03): resolved through the roster
  // (get_team_roster, coach/admin only — a player calling this gets []).
  async findByTeam(teamId: string): Promise<Unavailability[]> {
    const { data: roster, error: rosterError } = await this.client.rpc('get_team_roster', { p_team_id: teamId })
    if (rosterError) throw mapSupabaseError(rosterError)

    const userIds = ((roster ?? []) as TeamRosterPlayerDto[]).map((player) => player.user_id)
    if (userIds.length === 0) return []

    const { data, error } = await this.client
      .from('unavailabilities')
      .select('*')
      .in('user_id', userIds)
      .order('starts_on', { ascending: false })

    if (error) throw mapSupabaseError(error)
    return ((data ?? []) as UnavailabilityRow[]).map(toUnavailability)
  }
}
