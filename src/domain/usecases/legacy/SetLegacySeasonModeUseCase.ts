import type { LegacyPointsMode } from '@domain/entities/legacy'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { InvalidLegacyInputError } from '@domain/errors/invalid-legacy-input-error'
import { can } from '@domain/policies/can'
import type { LegacyRepository } from '@domain/repositories/legacy-repository'
import type { UserRepository } from '@domain/repositories/user-repository'

export interface SetLegacySeasonModeInput {
  actorId: string
  seasonId: string
  mode: string
}

const LEGACY_POINTS_MODES: LegacyPointsMode[] = ['cumulative', 'per_season']

// docs/specs/asc-legacy.md PO-LG-06/PO-LG-16 — sets the points mode of one
// season. A season counts points only once its mode AND tiers are configured;
// this is the "mode" half. Authorization before validation, same ordering as
// CreateSeasonUseCase: an unauthorized caller never learns what would have been
// rejected. RLS (legacy_season_settings_*_admin) is the real boundary.
//
// No audit entry: the spec's audit codes cover awards, rewards and rules
// (PO-LG-08), not the season configuration.
export class SetLegacySeasonModeUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly legacyRepository: LegacyRepository,
  ) {}

  async execute(input: SetLegacySeasonModeInput): Promise<void> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }
    if (!can(user, 'legacy:manage_tiers')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to configure Legacy`)
    }

    const mode = LEGACY_POINTS_MODES.find((m) => m === input.mode)
    if (!mode) {
      throw new InvalidLegacyInputError('mode must be cumulative or per_season')
    }

    await this.legacyRepository.setSeasonMode(input.seasonId, mode)
  }
}
