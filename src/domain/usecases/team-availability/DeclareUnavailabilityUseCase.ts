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

// Coach (own team): medical, suspension or absence. Dirigeant habilité:
// suspension or absence, club-wide. UX/use-case guard — RLS (unavailabilities_insert_coach /
// unavailabilities_insert_officer_suspension) is the real boundary.
export class DeclareUnavailabilityUseCase {
  constructor(private readonly repository: UnavailabilityRepository) {}

  async execute({ user, teamId, playerId, draft, now }: DeclareUnavailabilityInput): Promise<Unavailability> {
    if (!canWriteUnavailability(user, draft.kind, teamId)) {
      throw new ForbiddenError(`Declaring a ${draft.kind} unavailability is not granted for this team`)
    }

    const normalized = normalizeDraft(draft)
    const base = { userId: playerId, declaredBy: user.id, declaredAt: now.toISOString(), startsOn: normalized.startsOn }
    return this.repository.create(toNewUnavailability(base, normalized))
  }
}

function toNewUnavailability(
  base: { userId: string; declaredBy: string; declaredAt: string; startsOn: string },
  draft: UnavailabilityDraft,
): NewUnavailability {
  switch (draft.kind) {
    case 'medical':
      return { ...base, kind: 'medical', expectedReturnOn: draft.expectedReturnOn }
    case 'suspension':
      return { ...base, kind: 'suspension', matchCount: draft.matchCount, reason: draft.reason, liftedOn: draft.liftedOn }
    case 'absence':
      return { ...base, kind: 'absence', reason: draft.reason, expectedReturnOn: draft.expectedReturnOn }
  }
}
