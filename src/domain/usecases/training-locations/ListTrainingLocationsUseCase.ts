import type { TrainingLocation } from '../../entities/training-location'
import type { TrainingLocationRepository } from '../../repositories/training-location-repository'

// specs/web-localizations.md §2.5 — the backoffice admin list: every
// location, archived included. Reading is RLS-only (no `can()` check, §2.4):
// the route guard and RLS already bound who reaches it.
export class ListTrainingLocationsUseCase {
  constructor(private readonly trainingLocationRepository: TrainingLocationRepository) {}

  execute(): Promise<TrainingLocation[]> {
    return this.trainingLocationRepository.findAll()
  }
}
