import type { Unavailability } from '@domain/entities/unavailability'
import type { User } from '@domain/entities/user'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { canWriteUnavailability, toLocalIsoDate } from '@domain/policies/availability'
import type { UnavailabilityRepository } from '@domain/repositories/unavailability-repository'

export interface LiftUnavailabilityInput {
  user: User
  teamId: string
  existing: Unavailability
  now: Date
}

// "Mark available again": closes the record TODAY. The end bound is exclusive,
// so the player is available from today on (isUnavailabilityActive). Nothing is
// deleted — the history stays.
export class LiftUnavailabilityUseCase {
  constructor(private readonly repository: UnavailabilityRepository) {}

  async execute({ user, teamId, existing, now }: LiftUnavailabilityInput): Promise<Unavailability> {
    if (!canWriteUnavailability(user, existing.kind, teamId)) {
      throw new ForbiddenError(`Lifting a ${existing.kind} unavailability is not granted for this team`)
    }
    const today = toLocalIsoDate(now)
    const lifted: Unavailability =
      existing.kind === 'medical' ? { ...existing, expectedReturnOn: today } : { ...existing, liftedOn: today }
    return this.repository.update(lifted)
  }
}
