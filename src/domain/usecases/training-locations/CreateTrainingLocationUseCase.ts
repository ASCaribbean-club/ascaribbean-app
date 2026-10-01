import type { TrainingLocation } from '../../entities/training-location'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidTrainingLocationInputError } from '../../errors/invalid-training-location-input-error'
import { can } from '../../policies/can'
import type { TrainingLocationRepository } from '../../repositories/training-location-repository'
import type { UserRepository } from '../../repositories/user-repository'

export interface CreateTrainingLocationUseCaseInput {
  actorId: string
  name: string
  address: string
}

// specs/web-localizations.md §2.5/AC-WL-08 — authorization first (an
// unauthorized caller never learns which field would have been rejected),
// then trim + non-empty validation from the domain, before any network
// call. UX-side mirror of training_locations_insert_admin
// ('training_location:write'); RLS is the real gate. No audit entry
// (AC-WL-21, PO-WL-11 undecided).
export class CreateTrainingLocationUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly trainingLocationRepository: TrainingLocationRepository,
  ) {}

  async execute(input: CreateTrainingLocationUseCaseInput): Promise<TrainingLocation> {
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

    return this.trainingLocationRepository.create({ name, address })
  }
}
