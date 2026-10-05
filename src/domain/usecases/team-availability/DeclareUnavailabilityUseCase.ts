import type { NewUnavailability, Unavailability } from '@domain/entities/unavailability'
import type { User } from '@domain/entities/user'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { canWriteUnavailability } from '@domain/policies/availability'
import type { UnavailabilityRepository } from '@domain/repositories/unavailability-repository'
import { normalizeDraft, type UnavailabilityDraft } from './unavailability-draft'

export interface DeclareUnavailabilityInput {
  user: User
  // Team the player is listed under on the screen — scope of the coach check.
  teamId: string
  playerId: string
  draft: UnavailabilityDraft
  // Passed in, never `new Date()` here.
  now: Date
}

// Coach (own team): medical or suspension. Dirigeant habilité: suspension only,
// club-wide. UX/use-case guard — RLS (unavailabilities_insert_coach /
// unavailabilities_insert_officer_suspension) is the real boundary.
export class DeclareUnavailabilityUseCase {
  constructor(private readonly repository: UnavailabilityRepository) {}

  async execute({ user, teamId, playerId, draft, now }: DeclareUnavailabilityInput): Promise<Unavailability> {
    if (!canWriteUnavailability(user, draft.kind, teamId)) {
      throw new ForbiddenError(`Declaring a ${draft.kind} unavailability is not granted for this team`)
    }

    const normalized = normalizeDraft(draft)
    const base = { userId: playerId, declaredBy: user.id, declaredAt: now.toISOString(), startsOn: normalized.startsOn }
    const input: NewUnavailability =
      normalized.kind === 'medical'
        ? { ...base, kind: 'medical', expectedReturnOn: normalized.expectedReturnOn }
        : { ...base, kind: 'suspension', matchCount: normalized.matchCount, reason: normalized.reason, liftedOn: normalized.liftedOn }

    return this.repository.create(input)
  }
}
