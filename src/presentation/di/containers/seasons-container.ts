import type { SupabaseClient } from '@supabase/supabase-js'
import { SeasonRepositoryImpl } from '@data/repositories/SeasonRepositoryImpl'
import { UserRepositoryImpl } from '@data/repositories/UserRepositoryImpl'
import type { SeasonRepository } from '@domain/repositories/season-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { CreateSeasonUseCase } from '@domain/usecases/seasons/CreateSeasonUseCase'
import { UpdateSeasonUseCase } from '@domain/usecases/seasons/UpdateSeasonUseCase'

// specs/web-seasons.md §2.6 — a dedicated container for the /admin/seasons
// write path (findAll() is called directly from useBackofficeSeasonsViewModel,
// same "no wrapping use case for a plain passthrough read" precedent as
// news-container.ts's listAll()). Its OWN SeasonRepositoryImpl/UserRepositoryImpl
// instances, not shared with the ones other containers (profile-container.ts,
// coach-dashboard-container.ts, ...) already instantiate for their own
// SeasonRepository.findCurrent() needs — same per-container instance pattern
// used throughout di/containers/.
export interface SeasonsContainer {
  seasonRepository: SeasonRepository
  userRepository: UserRepository
  createSeasonUseCase: CreateSeasonUseCase
  updateSeasonUseCase: UpdateSeasonUseCase
}

export function createSeasonsContainer(supabaseClient: SupabaseClient): SeasonsContainer {
  const seasonRepository = new SeasonRepositoryImpl(supabaseClient)
  const userRepository = new UserRepositoryImpl(supabaseClient)
  const createSeasonUseCase = new CreateSeasonUseCase(userRepository, seasonRepository)
  const updateSeasonUseCase = new UpdateSeasonUseCase(userRepository, seasonRepository)

  return {
    seasonRepository,
    userRepository,
    createSeasonUseCase,
    updateSeasonUseCase,
  }
}
