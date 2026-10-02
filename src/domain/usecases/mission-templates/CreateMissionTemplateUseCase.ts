import type { ConvocationType } from '@domain/entities/convocation'
import type { MissionTemplate } from '@domain/entities/mission-template'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { InvalidMissionTemplateError } from '@domain/errors/invalid-mission-template-error'
import { can } from '@domain/policies/can'
import { isValidMissionCapacity, isValidMissionDescription, isValidMissionLabel, normalizeMissionDescription } from '@domain/policies/mission-rules'
import type { MissionTemplateRepository } from '@domain/repositories/mission-template-repository'
import type { UserRepository } from '@domain/repositories/user-repository'

export interface CreateMissionTemplateUseCaseInput {
  actorId: string
  convocationType: ConvocationType
  label: string
  defaultCapacity: number
  description: string | null
}

// specs/web-mission-templates.md §2.2/AC-MT-08 — authorization first, then
// trim + validation before any network call. UX-side mirror of
// mission_templates_insert_admin ('mission-template:manage'); RLS is the
// real gate. The created template is active (column default).
export class CreateMissionTemplateUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly missionTemplateRepository: MissionTemplateRepository,
  ) {}

  async execute(input: CreateMissionTemplateUseCaseInput): Promise<MissionTemplate> {
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

    return this.missionTemplateRepository.create({
      convocationType: input.convocationType,
      label,
      defaultCapacity: input.defaultCapacity,
      description,
    })
  }
}
