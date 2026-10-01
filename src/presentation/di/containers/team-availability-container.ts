import type { SupabaseClient } from '@supabase/supabase-js'
import { SeasonRepositoryImpl } from '@data/repositories/SeasonRepositoryImpl'
import { TeamAvailabilityRepositoryImpl } from '@data/repositories/TeamAvailabilityRepositoryImpl'
import { TeamRepositoryImpl } from '@data/repositories/TeamRepositoryImpl'
import { UnavailabilityRepositoryImpl } from '@data/repositories/UnavailabilityRepositoryImpl'
import type { TeamAvailabilityRepository } from '@domain/repositories/team-availability-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import type { UnavailabilityRepository } from '@domain/repositories/unavailability-repository'
import { GetTeamAvailabilityUseCase } from '@domain/usecases/team-availability/GetTeamAvailabilityUseCase'

export interface TeamAvailabilityContainer {
  // Repositories
  teamRepository: TeamRepository
  teamAvailabilityRepository: TeamAvailabilityRepository
  // Fully implemented (specs/player-unavailability.md AC-PU-10) but no use
  // case reads it yet: the declare flow is a follow-up.
  unavailabilityRepository: UnavailabilityRepository

  // Use cases
  getTeamAvailabilityUseCase: GetTeamAvailabilityUseCase
}

export function createTeamAvailabilityContainer(supabaseClient: SupabaseClient): TeamAvailabilityContainer {
  const seasonRepository = new SeasonRepositoryImpl(supabaseClient)
  const teamRepository = new TeamRepositoryImpl(supabaseClient, seasonRepository)
  const teamAvailabilityRepository = new TeamAvailabilityRepositoryImpl(supabaseClient)
  const unavailabilityRepository = new UnavailabilityRepositoryImpl(supabaseClient)

  return {
    teamRepository,
    teamAvailabilityRepository,
    unavailabilityRepository,
    getTeamAvailabilityUseCase: new GetTeamAvailabilityUseCase(teamAvailabilityRepository),
  }
}
