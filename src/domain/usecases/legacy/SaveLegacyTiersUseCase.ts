import type { LegacyTierInput } from '@domain/entities/legacy'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { can } from '@domain/policies/can'
import { validateLegacyTiers } from '@domain/policies/legacy-rules'
import type { LegacyRepository } from '@domain/repositories/legacy-repository'
import type { UserRepository } from '@domain/repositories/user-repository'

export interface SaveLegacyTiersInput {
  actorId: string
  tiers: LegacyTierInput[]
}

// Backoffice "ASC Legacy" tab — saves the tier set for the current season and
// every future one (past seasons keep theirs). Authorization before validation,
// same ordering as CreateSeasonUseCase. RLS / the RPC's admin guard are the real
// boundary ('legacy:manage_tiers'). No audit entry: the spec's audit codes cover
// awards, rewards and rules (PO-LG-08), not the tier configuration.
//
// Returns the number of seasons written, so the screen can say how far the
// change reached.
export class SaveLegacyTiersUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly legacyRepository: LegacyRepository,
  ) {}

  async execute(input: SaveLegacyTiersInput): Promise<number> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }
    if (!can(user, 'legacy:manage_tiers')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to configure Legacy`)
    }

    validateLegacyTiers(input.tiers)
    return this.legacyRepository.saveTiers(input.tiers)
  }
}
