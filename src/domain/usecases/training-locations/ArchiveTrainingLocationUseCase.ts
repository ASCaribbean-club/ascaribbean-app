import type { TrainingLocation } from '../../entities/training-location'
import { ForbiddenError } from '../../errors/forbidden-error'
import { can } from '../../policies/can'
import type { TrainingLocationRepository } from '../../repositories/training-location-repository'
import type { UserRepository } from '../../repositories/user-repository'

export interface ArchiveTrainingLocationUseCaseInput {
  actorId: string
  trainingLocationId: string
}

// specs/web-localizations.md §2.5/AC-WL-08 — archiving is idempotent: an
// already archived location succeeds without error (the repository sets
// is_archived = true regardless of its current value). Mirrors
// training_locations_update_admin ('training_location:write') — archiving
// goes through the update policy, there is no dedicated one and no delete.
export class ArchiveTrainingLocationUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly trainingLocationRepository: TrainingLocationRepository,
  ) {}

  async execute(input: ArchiveTrainingLocationUseCaseInput): Promise<TrainingLocation> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }
    if (!can(user, 'training_location:write')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to write training locations`)
    }

    return this.trainingLocationRepository.archive(input.trainingLocationId)
  }
}
