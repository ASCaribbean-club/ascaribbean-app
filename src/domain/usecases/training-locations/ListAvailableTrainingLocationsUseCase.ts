import type { TrainingLocation } from '../../entities/training-location'
import type { TrainingLocationRepository } from '../../repositories/training-location-repository'

// specs/web-localizations.md §2.5/§2.7 — the options of the mobile
// "Lieu d'entraînement" selector: non-archived locations only. An empty
// result is a valid state (AC-WL-17), never an error.
export class ListAvailableTrainingLocationsUseCase {
  constructor(private readonly trainingLocationRepository: TrainingLocationRepository) {}

  execute(): Promise<TrainingLocation[]> {
    return this.trainingLocationRepository.findAvailable()
  }
}
