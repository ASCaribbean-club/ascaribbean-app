import type { SupabaseClient } from '@supabase/supabase-js'
import type { Team } from '@domain/entities/team'
import type { SeasonRepository } from '@domain/repositories/season-repository'
import type { CreateTeamInput, TeamRepository, UpdateTeamInput } from '@domain/repositories/team-repository'
import type { TeamRow } from '../dto/team-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toTeam, toTeamInsertRow, toTeamUpdateRow } from '../mappers/team-mapper'

const TEAM_COLUMNS = 'id, name, section_id, season_id'

export class TeamRepositoryImpl implements TeamRepository {
  private readonly client: SupabaseClient
  private readonly seasonRepository: SeasonRepository

  constructor(client: SupabaseClient, seasonRepository: SeasonRepository) {
    this.client = client
    this.seasonRepository = seasonRepository
  }

  async findById(id: string): Promise<Team | null> {
    const currentSeason = await this.seasonRepository.findCurrent()
    if (!currentSeason) return null // gap between two seasons — valid state, not an error

    const { data, error } = await this.client
      .from('teams')
      .select('id, name, section_id, season_id')
      .eq('id', id)
      .eq('season_id', currentSeason.id)
      .single<TeamRow>()

    if (error) throw mapSupabaseError(error)
    return toTeam(data)
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

  // specs/section-and-teams.md §2.7/AC-ST-13 — the /admin/teams and
  // /admin/sections admin lists. Deliberately NO season filter and NO call
  // to seasonRepository.findCurrent() (unlike findById/findByIds above):
  // backed by teams_select_team_scoped's `or private.is_admin()` branch,
  // which stays unrestricted by season on purpose (AC-ST-02) — returns
  // every team, every season, including during a summer gap where
  // current_season() resolves to nothing (a valid state, not an error,
  // AC-ST-13).
  async findAllForAdmin(): Promise<Team[]> {
    const { data, error } = await this.client.from('teams').select(TEAM_COLUMNS).overrideTypes<TeamRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toTeam)
  }

  // teams_insert_admin (RLS) — mirrors 'team:write'.
  async create(input: CreateTeamInput): Promise<Team> {
    const { data, error } = await this.client
      .from('teams')
      .insert(toTeamInsertRow(input))
      .select(TEAM_COLUMNS)
      .single()
      .overrideTypes<TeamRow>()

    if (error) throw mapSupabaseError(error)
    return toTeam(data)
  }

  // teams_update_admin (RLS) — mirrors 'team:write'. No "which rows are
  // modifiable" restriction (§2.6) — this repository doesn't pre-filter by
  // row state either.
  async update(id: string, input: UpdateTeamInput): Promise<Team> {
    const { data, error } = await this.client
      .from('teams')
      .update(toTeamUpdateRow(input))
      .eq('id', id)
      .select(TEAM_COLUMNS)
      .single()
      .overrideTypes<TeamRow>()

    if (error) throw mapSupabaseError(error)
    return toTeam(data)
  }
}
