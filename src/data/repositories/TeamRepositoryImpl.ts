import type { SupabaseClient } from '@supabase/supabase-js'
import type { Team } from '@domain/entities/team'
import type { SeasonRepository } from '@domain/repositories/season-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import type { TeamRow } from '../dto/team-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toTeam } from '../mappers/team-mapper'

export class TeamRepositoryImpl implements TeamRepository {
  private readonly client: SupabaseClient
  private readonly seasonRepository: SeasonRepository

  constructor(client: SupabaseClient, seasonRepository: SeasonRepository) {
    this.client = client
    this.seasonRepository = seasonRepository
  }

  // AC-CD-01: a coach's assignment from a prior season must not resolve here
  // — teams are per-season rows (see the table comment in the initial
  // schema migration), so "current teams" means "current season's teams".
  // This is application-level correctness only; the actual security boundary
  // is the matching filter on the teams_select_team_scoped RLS policy (see
  // supabase/migrations/20260819153918_season_scoping_correction.sql).
  async findByIds(ids: string[]): Promise<Team[]> {
    const currentSeason = await this.seasonRepository.findCurrent()
    if (!currentSeason) return [] // gap between two seasons — valid state, not an error

    const { data, error } = await this.client
      .from('teams')
      .select('id, name, section_id, season_id')
      .in('id', ids)
      .eq('season_id', currentSeason.id)
      .overrideTypes<TeamRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toTeam)
  }

  // For now we will count all active membership's user assigned to the team
  async countActiveMembers(_teamId: string): Promise<number> {
    // team_active_headcount groups by team_id with no zero-fill (see the view's
    // migration comment) — a team with no active/valid-membership players has
    // no row at all, not a row with headcount 0. maybeSingle() lets that through
    // instead of throwing (single() 406s on zero rows).
    const { data, error } = await this.client
      .from('team_active_headcount')
      .select('headcount')
      .eq('team_id', _teamId)
      .maybeSingle()

    if (error) throw mapSupabaseError(error)
    return data?.headcount ?? 0
  }
}
