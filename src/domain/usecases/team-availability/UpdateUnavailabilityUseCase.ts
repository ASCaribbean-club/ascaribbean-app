import type { Unavailability } from '@domain/entities/unavailability'
import type { User } from '@domain/entities/user'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { canWriteUnavailability } from '@domain/policies/availability'
import type { UnavailabilityRepository } from '@domain/repositories/unavailability-repository'
import { applyDraft, type UnavailabilityDraft } from './unavailability-draft'

export interface UpdateUnavailabilityInput {
  user: User
  teamId: string
  existing: Unavailability
  draft: UnavailabilityDraft
}

// Modifies an existing unavailability (dates, match count, reason). The kind
// is frozen — same as the column grant in the migration.
export class UpdateUnavailabilityUseCase {
  constructor(private readonly repository: UnavailabilityRepository) {}

  async execute({ user, teamId, existing, draft }: UpdateUnavailabilityInput): Promise<Unavailability> {
    if (!canWriteUnavailability(user, existing.kind, teamId)) {
      throw new ForbiddenError(`Editing a ${existing.kind} unavailability is not granted for this team`)
    }
    return this.repository.update(applyDraft(existing, draft))
  }
}
