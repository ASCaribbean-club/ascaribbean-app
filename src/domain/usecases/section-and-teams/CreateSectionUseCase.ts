import { SECTION_TYPES, type Section, type SectionType } from '../../entities/section'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidSectionInputError } from '../../errors/invalid-section-input-error'
import { can } from '../../policies/can'
import type { SectionRepository } from '../../repositories/section-repository'
import type { UserRepository } from '../../repositories/user-repository'

export interface CreateSectionUseCaseInput {
  actorId: string
  name: string
  type: string
}

// specs/section-and-teams.md §2.5/§3/AC-ST-11 — same authorization-before-
// validation ordering as CreateSeasonUseCase: an unauthorized caller never
// learns which field would have been rejected. Club-wide action, no
// team/section scope needed in the can() call ('admin' carries no scope
// field, §3) — no context object needed here.
export class CreateSectionUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sectionRepository: SectionRepository,
  ) {}

  async execute(input: CreateSectionUseCaseInput): Promise<Section> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }

    if (!can(user, 'section:write')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to write sections`)
    }

    // AC-ST-11 — rejected from the domain (DomainError, not a
    // component-level check), before any network call.
    const name = input.name.trim()
    if (!name) {
      throw new InvalidSectionInputError('name is required')
    }
    if (!SECTION_TYPES.includes(input.type as SectionType)) {
      throw new InvalidSectionInputError(`type must be one of ${SECTION_TYPES.join(', ')}`)
    }

    return this.sectionRepository.create({
      name,
      type: input.type as SectionType,
    })
  }
}
