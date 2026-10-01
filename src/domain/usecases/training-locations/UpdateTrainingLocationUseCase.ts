import type { TrainingLocation } from '../../entities/training-location'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidTrainingLocationInputError } from '../../errors/invalid-training-location-input-error'
import { can } from '../../policies/can'
import type { TrainingLocationRepository } from '../../repositories/training-location-repository'
import type { UserRepository } from '../../repositories/user-repository'

export interface UpdateTrainingLocationUseCaseInput {
  actorId: string
  trainingLocationId: string
  name: string
  address: string
}

// specs/web-localizations.md §2.5/AC-WL-08 — same checks as
// CreateTrainingLocationUseCase; writes the SAME row, never a duplicate.
// Mirrors training_locations_update_admin ('training_location:write').
// Side effect worth knowing (§4): a rename is visible on every convocation
// that references this location, past ones included.
export class UpdateTrainingLocationUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly trainingLocationRepository: TrainingLocationRepository,
  ) {}

  async execute(input: UpdateTrainingLocationUseCaseInput): Promise<TrainingLocation> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }
    if (!can(user, 'training_location:write')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to write training locations`)
    }

    const name = input.name.trim()
    const address = input.address.trim()
    if (!name) {
      throw new InvalidTrainingLocationInputError('name is required')
    }
    if (!address) {
      throw new InvalidTrainingLocationInputError('address is required')
    }

    return this.trainingLocationRepository.update(input.trainingLocationId, { name, address })
  }
}
