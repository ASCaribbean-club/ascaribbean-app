import type { MissionTemplate } from '@domain/entities/mission-template'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { InvalidMissionTemplateError } from '@domain/errors/invalid-mission-template-error'
import { can } from '@domain/policies/can'
import { isValidMissionCapacity, isValidMissionDescription, isValidMissionLabel, normalizeMissionDescription } from '@domain/policies/mission-rules'
import type { MissionTemplateRepository } from '@domain/repositories/mission-template-repository'
import type { UserRepository } from '@domain/repositories/user-repository'

export interface UpdateMissionTemplateUseCaseInput {
  actorId: string
  missionTemplateId: string
  label: string
  defaultCapacity: number
  description: string | null
}

// specs/web-mission-templates.md §2.2/AC-MT-08 — same checks and order as
// CreateMissionTemplateUseCase; writes the SAME row. The convocation type is
// not part of the input (fixed at creation). Mirrors
// mission_templates_update_admin ('mission-template:manage').
export class UpdateMissionTemplateUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly missionTemplateRepository: MissionTemplateRepository,
  ) {}

  async execute(input: UpdateMissionTemplateUseCaseInput): Promise<MissionTemplate> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }
    if (!can(user, 'mission-template:manage')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to manage mission templates`)
    }

    const label = input.label.trim()
    const description = normalizeMissionDescription(input.description)
    if (!isValidMissionLabel(label) || !isValidMissionCapacity(input.defaultCapacity) || !isValidMissionDescription(description)) {
      throw new InvalidMissionTemplateError('label is required, capacity must be between 1 and 3, description at most 500 characters')
    }

    return this.missionTemplateRepository.update(input.missionTemplateId, {
      label,
      defaultCapacity: input.defaultCapacity,
      description,
    })
  }
}
