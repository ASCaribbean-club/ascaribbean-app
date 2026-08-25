import type { SupabaseClient } from '@supabase/supabase-js'
import { ConvocationRepositoryImpl } from '@data/repositories/ConvocationRepositoryImpl'
import { ConvocationResponseRepositoryImpl } from '@data/repositories/ConvocationResponseRepositoryImpl'
import { MatchDetailsRepositoryImpl } from '@data/repositories/MatchDetailsRepositoryImpl'
import { OpponentRepositoryImpl } from '@data/repositories/OpponentRepositoryImpl'
import { SeasonRepositoryImpl } from '@data/repositories/SeasonRepositoryImpl'
import { TeamRepositoryImpl } from '@data/repositories/TeamRepositoryImpl'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { ConvocationResponseRepository } from '@domain/repositories/convocation-response-repository'
import type { MatchDetailsRepository } from '@domain/repositories/match-details-repository'
import type { OpponentRepository } from '@domain/repositories/opponent-repository'
import type { SeasonRepository } from '@domain/repositories/season-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import { GetCoachTeamsUseCase } from '@domain/usecases/coach-dashboard/GetCoachTeamsUseCase'
import { ListUpcomingTeamConvocationsUseCase } from '@domain/usecases/coach-dashboard/ListUpcomingTeamConvocationsUseCase'

export interface CoachDashboardContainer {
  // Repositories
  seasonRepository: SeasonRepository
  teamRepository: TeamRepository
  convocationRepository: ConvocationRepository
  convocationResponseRepository: ConvocationResponseRepository
  matchDetailsRepository: MatchDetailsRepository
  opponentRepository: OpponentRepository

  // Use cases
  getCoachTeamsUseCase: GetCoachTeamsUseCase
  listUpcomingTeamConvocationsUseCase: ListUpcomingTeamConvocationsUseCase
}

export function createCoachDashboardContainer(supabaseClient: SupabaseClient): CoachDashboardContainer {
  const seasonRepository = new SeasonRepositoryImpl(supabaseClient)
  const teamRepository = new TeamRepositoryImpl(supabaseClient, seasonRepository)
  const convocationRepository = new ConvocationRepositoryImpl(supabaseClient)
  const convocationResponseRepository = new ConvocationResponseRepositoryImpl(supabaseClient)
  const matchDetailsRepository = new MatchDetailsRepositoryImpl(supabaseClient)
  const opponentRepository = new OpponentRepositoryImpl(supabaseClient)

  return {
    seasonRepository,
    teamRepository,
    convocationRepository,
    convocationResponseRepository,
    matchDetailsRepository,
    opponentRepository,
    getCoachTeamsUseCase: new GetCoachTeamsUseCase(teamRepository),
    listUpcomingTeamConvocationsUseCase: new ListUpcomingTeamConvocationsUseCase(
      convocationRepository,
      convocationResponseRepository,
      matchDetailsRepository,
      opponentRepository,
    ),
  }
}
