import type { SupabaseClient } from '@supabase/supabase-js'
import { TrainingLocationRepositoryImpl } from '@data/repositories/TrainingLocationRepositoryImpl'
import { UserRepositoryImpl } from '@data/repositories/UserRepositoryImpl'
import type { TrainingLocationRepository } from '@domain/repositories/training-location-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { ArchiveTrainingLocationUseCase } from '@domain/usecases/training-locations/ArchiveTrainingLocationUseCase'
import { CreateTrainingLocationUseCase } from '@domain/usecases/training-locations/CreateTrainingLocationUseCase'
import { ListTrainingLocationsUseCase } from '@domain/usecases/training-locations/ListTrainingLocationsUseCase'
import { UpdateTrainingLocationUseCase } from '@domain/usecases/training-locations/UpdateTrainingLocationUseCase'

// specs/web-localizations.md §2.5 — the /admin/locations console: the admin
// list read plus the three writes. Own repository instances, same
// per-container pattern as every other file in di/containers/.
export interface TrainingLocationsContainer {
  trainingLocationRepository: TrainingLocationRepository
  userRepository: UserRepository
  listTrainingLocationsUseCase: ListTrainingLocationsUseCase
  createTrainingLocationUseCase: CreateTrainingLocationUseCase
  updateTrainingLocationUseCase: UpdateTrainingLocationUseCase
  archiveTrainingLocationUseCase: ArchiveTrainingLocationUseCase
}

export function createTrainingLocationsContainer(supabaseClient: SupabaseClient): TrainingLocationsContainer {
  const trainingLocationRepository = new TrainingLocationRepositoryImpl(supabaseClient)
  const userRepository = new UserRepositoryImpl(supabaseClient)

  return {
    trainingLocationRepository,
    userRepository,
    listTrainingLocationsUseCase: new ListTrainingLocationsUseCase(trainingLocationRepository),
    createTrainingLocationUseCase: new CreateTrainingLocationUseCase(userRepository, trainingLocationRepository),
    updateTrainingLocationUseCase: new UpdateTrainingLocationUseCase(userRepository, trainingLocationRepository),
    archiveTrainingLocationUseCase: new ArchiveTrainingLocationUseCase(userRepository, trainingLocationRepository),
  }
}
