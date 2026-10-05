import type { Unavailability } from '@domain/entities/unavailability'
import type { User } from '@domain/entities/user'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { canWriteUnavailability, isUnavailabilityActive } from '@domain/policies/availability'
import type { UnavailabilityRepository } from '@domain/repositories/unavailability-repository'

export interface GetActiveUnavailabilitiesInput {
  user: User
  teamId: string
  playerId: string
  now: Date
}

// Pre-fills the edit sheet: the player's currently active records, restricted
// to the kinds this user may write (a Dirigeant never receives a medical one,
// even if a repository handed it back — RLS already hides it from them).
export class GetActiveUnavailabilitiesUseCase {
  constructor(private readonly repository: UnavailabilityRepository) {}

  async execute({ user, teamId, playerId, now }: GetActiveUnavailabilitiesInput): Promise<Unavailability[]> {
    if (!canWriteUnavailability(user, 'suspension', teamId)) {
      throw new ForbiddenError('Reading unavailabilities to edit them is not granted for this team')
    }
    const all = await this.repository.findByUser(playerId)
    return all.filter((u) => isUnavailabilityActive(u, now) && canWriteUnavailability(user, u.kind, teamId))
  }
}
