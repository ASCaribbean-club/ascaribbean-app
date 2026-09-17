import type { Team } from '../../entities/team'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidTeamInputError } from '../../errors/invalid-team-input-error'
import { can } from '../../policies/can'
import type { TeamRepository } from '../../repositories/team-repository'
import type { UserRepository } from '../../repositories/user-repository'

export interface CreateTeamUseCaseInput {
  actorId: string
  name: string
  sectionId: string
  seasonId: string
}

// specs/section-and-teams.md §2.2/§3/AC-ST-11 — "Section et saison sont
// obligatoires : une équipe est propre à une saison et n'est jamais
// réutilisée d'une saison à l'autre" (the mockup's own italic copy, a
// business rule, not decoration). This use case refuses a team with no
// section or no season BEFORE any network call, backed at the database
// level by the `not null` constraints this same pass adds to
// teams.section_id/season_id (§2.2, AC-ST-05).
export class CreateTeamUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly teamRepository: TeamRepository,
  ) {}

  async execute(input: CreateTeamUseCaseInput): Promise<Team> {
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

    return this.teamRepository.create({
      name,
      sectionId: input.sectionId,
      seasonId: input.seasonId,
    })
  }
}
