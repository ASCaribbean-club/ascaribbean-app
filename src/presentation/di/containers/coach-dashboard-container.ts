import type { SupabaseClient } from '@supabase/supabase-js'
import { ConvocationRepositoryImpl } from '@data/repositories/ConvocationRepositoryImpl'
import { ConvocationResponseRepositoryImpl } from '@data/repositories/ConvocationResponseRepositoryImpl'
import { TeamRepositoryImpl } from '@data/repositories/TeamRepositoryImpl'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { ConvocationResponseRepository } from '@domain/repositories/convocation-response-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import { GetCoachTeamsUseCase } from '@domain/usecases/coach-dashboard/GetCoachTeamsUseCase'
import { ListUpcomingTeamConvocationsUseCase } from '@domain/usecases/coach-dashboard/ListUpcomingTeamConvocationsUseCase'

export interface CoachDashboardContainer {
  // Repositories
  teamRepository: TeamRepository
  convocationRepository: ConvocationRepository
  convocationResponseRepository: ConvocationResponseRepository

  // Use cases
  getCoachTeamsUseCase: GetCoachTeamsUseCase
  listUpcomingTeamConvocationsUseCase: ListUpcomingTeamConvocationsUseCase
}

export function createCoachDashboardContainer(supabaseClient: SupabaseClient): CoachDashboardContainer {
  const teamRepository = new TeamRepositoryImpl(supabaseClient)
  const convocationRepository = new ConvocationRepositoryImpl(supabaseClient)
  const convocationResponseRepository = new ConvocationResponseRepositoryImpl(supabaseClient)

  return {
    teamRepository,
    convocationRepository,
    convocationResponseRepository,
    getCoachTeamsUseCase: new GetCoachTeamsUseCase(teamRepository),
    listUpcomingTeamConvocationsUseCase: new ListUpcomingTeamConvocationsUseCase(
      convocationRepository,
      convocationResponseRepository,
    ),
  }
}
