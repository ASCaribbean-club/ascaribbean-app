import type { Team } from '../../entities/team'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidTeamInputError } from '../../errors/invalid-team-input-error'
import { can } from '../../policies/can'
import type { TeamRepository } from '../../repositories/team-repository'
import type { UserRepository } from '../../repositories/user-repository'

export interface UpdateTeamUseCaseInput {
  actorId: string
  teamId: string
  name: string
  sectionId: string
  seasonId: string
}

// specs/section-and-teams.md §2.6/§3/§4 — same authorization + validation as
// CreateTeamUseCase. No "ended season" restriction is applied here by
// analogy with seasons_update_admin — the mockup shows the edit pencil even
// on the 2024-2025 row, and no document requires otherwise (§2.6, PO-ST-04c
// stays open). Changing section_id/season_id on an existing team has real
// side effects on who can still see it (§4) — this use case does not guard
// against that (PO-ST-04a is open), it only enforces that neither field is
// left empty, same as creation.
export class UpdateTeamUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly teamRepository: TeamRepository,
  ) {}

  async execute(input: UpdateTeamUseCaseInput): Promise<Team> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }

    if (!can(user, 'team:write')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to write teams`)
    }

    const name = input.name.trim()
    if (!name) {
      throw new InvalidTeamInputError('name is required')
    }
    if (!input.sectionId) {
      throw new InvalidTeamInputError('sectionId is required')
    }
    if (!input.seasonId) {
      throw new InvalidTeamInputError('seasonId is required')
    }

    // AC-ST-24 — updates the SAME row, never creates a duplicate.
    return this.teamRepository.update(input.teamId, {
      name,
      sectionId: input.sectionId,
      seasonId: input.seasonId,
    })
  }
}
