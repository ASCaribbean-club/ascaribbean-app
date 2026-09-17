import { SECTION_TYPES, type Section, type SectionType } from '../../entities/section'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidSectionInputError } from '../../errors/invalid-section-input-error'
import { can } from '../../policies/can'
import type { SectionRepository } from '../../repositories/section-repository'
import type { UserRepository } from '../../repositories/user-repository'

export interface UpdateSectionUseCaseInput {
  actorId: string
  sectionId: string
  name: string
  type: string
}

// specs/section-and-teams.md §2.6/§3 — WHO may write is 'section:write'
// (checked below, same as CreateSectionUseCase). Unlike
// UpdateSeasonUseCase, there is no "which rows are modifiable" state rule
// to deliberately leave to RLS here: no document requires a "section with
// teams" or any other state to be locked (PO-ST-04b), and no
// sections_update_admin clause restricts it beyond private.is_admin().
export class UpdateSectionUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sectionRepository: SectionRepository,
  ) {}

  async execute(input: UpdateSectionUseCaseInput): Promise<Section> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }

    if (!can(user, 'section:write')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to write sections`)
    }

    const name = input.name.trim()
    if (!name) {
      throw new InvalidSectionInputError('name is required')
    }
    if (!SECTION_TYPES.includes(input.type as SectionType)) {
      throw new InvalidSectionInputError(`type must be one of ${SECTION_TYPES.join(', ')}`)
    }

    // AC-ST-24 — updates the SAME row, never creates a duplicate.
    return this.sectionRepository.update(input.sectionId, {
      name,
      type: input.type as SectionType,
    })
  }
}
