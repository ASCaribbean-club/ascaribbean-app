import type { SupabaseClient } from '@supabase/supabase-js'
import type { Convocation } from '@domain/entities/convocation'
import type { Team } from '@domain/entities/team'
import type { ClubScheduleRepository } from '@domain/repositories/club-schedule-repository'
import type { SeasonRepository } from '@domain/repositories/season-repository'
import type { ConvocationRow } from '../dto/convocation-dto'
import type { TeamRow } from '../dto/team-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toConvocation } from '../mappers/convocation-mapper'
import { toTeam } from '../mappers/team-mapper'
import { CONVOCATION_COLUMNS } from './ConvocationRepositoryImpl'

// specs/mobile-dirigeant-habilite.md — club-wide reads for the Dirigeant
// views. The real boundary is RLS: teams_select_team_scoped (current-season
// authorized-officer branch, supabase/migrations/
// 20261003123353_dirigeant_teams_select_current_season.sql) and
// convocations_select_team_scoped (authorized-officer branch). The season
// filter below is application-level correctness, the RLS branch repeats it.
export class ClubScheduleRepositoryImpl implements ClubScheduleRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly seasonRepository: SeasonRepository,
  ) {}

  async listCurrentSeasonTeams(): Promise<Team[]> {
    const currentSeason = await this.seasonRepository.findCurrent()
    if (!currentSeason) return [] // gap between two seasons — valid state

    const { data, error } = await this.client
      .from('teams')
      .select('id, name, section_id, season_id')
      .eq('season_id', currentSeason.id)
      .order('name', { ascending: true })
      .overrideTypes<TeamRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toTeam)
  }

  async listConvocationsForTeams(teamIds: string[]): Promise<Convocation[]> {
    if (teamIds.length === 0) return []

    const { data, error } = await this.client
      .from('convocations')
      .select(CONVOCATION_COLUMNS)
      .in('team_id', teamIds)
      .order('date', { ascending: true })
      .overrideTypes<ConvocationRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toConvocation)
  }
}
