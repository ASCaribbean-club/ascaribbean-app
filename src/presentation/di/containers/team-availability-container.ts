import type { SupabaseClient } from '@supabase/supabase-js'
import { SeasonRepositoryImpl } from '@data/repositories/SeasonRepositoryImpl'
import { TeamAvailabilityRepositoryImpl } from '@data/repositories/TeamAvailabilityRepositoryImpl'
import { TeamRepositoryImpl } from '@data/repositories/TeamRepositoryImpl'
import { UnavailabilityRepositoryImpl } from '@data/repositories/UnavailabilityRepositoryImpl'
import type { TeamAvailabilityRepository } from '@domain/repositories/team-availability-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import type { UnavailabilityRepository } from '@domain/repositories/unavailability-repository'
import { DeclareUnavailabilityUseCase } from '@domain/usecases/team-availability/DeclareUnavailabilityUseCase'
import { GetActiveUnavailabilitiesUseCase } from '@domain/usecases/team-availability/GetActiveUnavailabilitiesUseCase'
import { LiftUnavailabilityUseCase } from '@domain/usecases/team-availability/LiftUnavailabilityUseCase'
import { UpdateUnavailabilityUseCase } from '@domain/usecases/team-availability/UpdateUnavailabilityUseCase'
import { GetTeamAvailabilityUseCase } from '@domain/usecases/team-availability/GetTeamAvailabilityUseCase'

export interface TeamAvailabilityContainer {
  // Repositories
  teamRepository: TeamRepository
  teamAvailabilityRepository: TeamAvailabilityRepository
  unavailabilityRepository: UnavailabilityRepository

  // Use cases
  getTeamAvailabilityUseCase: GetTeamAvailabilityUseCase
  getActiveUnavailabilitiesUseCase: GetActiveUnavailabilitiesUseCase
  declareUnavailabilityUseCase: DeclareUnavailabilityUseCase
  updateUnavailabilityUseCase: UpdateUnavailabilityUseCase
  liftUnavailabilityUseCase: LiftUnavailabilityUseCase
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
    getActiveUnavailabilitiesUseCase: new GetActiveUnavailabilitiesUseCase(unavailabilityRepository),
    declareUnavailabilityUseCase: new DeclareUnavailabilityUseCase(unavailabilityRepository),
    updateUnavailabilityUseCase: new UpdateUnavailabilityUseCase(unavailabilityRepository),
    liftUnavailabilityUseCase: new LiftUnavailabilityUseCase(unavailabilityRepository),
  }
}
