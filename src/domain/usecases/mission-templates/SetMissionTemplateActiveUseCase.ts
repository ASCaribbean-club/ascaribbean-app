import type { MissionTemplate } from '@domain/entities/mission-template'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { can } from '@domain/policies/can'
import type { MissionTemplateRepository } from '@domain/repositories/mission-template-repository'
import type { UserRepository } from '@domain/repositories/user-repository'

export interface SetMissionTemplateActiveUseCaseInput {
  actorId: string
  missionTemplateId: string
  isActive: boolean
}

// specs/web-mission-templates.md §2.2/AC-MT-09 (PO-MT-01 assumption) —
// deactivate / reactivate. Idempotent in both directions: the repository
// writes is_active regardless of its current value. Goes through
// mission_templates_update_admin ('mission-template:manage'); no delete.
export class SetMissionTemplateActiveUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly missionTemplateRepository: MissionTemplateRepository,
  ) {}

  async execute(input: SetMissionTemplateActiveUseCaseInput): Promise<MissionTemplate> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }
    if (!can(user, 'mission-template:manage')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to manage mission templates`)
    }

    return this.missionTemplateRepository.setActive(input.missionTemplateId, input.isActive)
  }
}
