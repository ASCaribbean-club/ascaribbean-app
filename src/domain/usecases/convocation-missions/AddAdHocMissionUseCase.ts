import type { ConvocationMission } from '@domain/entities/convocation-mission'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { InvalidMissionTemplateError } from '@domain/errors/invalid-mission-template-error'
import { can } from '@domain/policies/can'
import { isValidMissionCapacity, isValidMissionLabel } from '@domain/policies/mission-rules'
import type { ConvocationMissionRepository } from '@domain/repositories/convocation-mission-repository'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { loadMissionContext } from './mission-context'

export interface AddAdHocMissionInput {
  actorId: string
  convocationId: string
  label: string
  capacity: number
}

// specs/match-details-missions.md §2.4/R6 — a manager adds an ad hoc mission
// (templateId null). Authorization first, then trimmed label and capacity
// validated BEFORE any network call. Mirrors the insert policy of
// convocation_missions ('mission:manage').
// PO-MM-07 (open): no dedicated error exists for an invalid ad hoc input, the
// existing InvalidMissionTemplateError is reused until it is decided.
export class AddAdHocMissionUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly convocationRepository: ConvocationRepository,
    private readonly teamRepository: TeamRepository,
    private readonly missionRepository: ConvocationMissionRepository,
  ) {}

  async execute(input: AddAdHocMissionInput): Promise<ConvocationMission> {
    const { user, convocation, sectionId } = await loadMissionContext(
      this.userRepository,
      this.convocationRepository,
      this.teamRepository,
      input.actorId,
      input.convocationId,
    )

    if (!can(user, 'mission:manage', { teamId: convocation.teamId, sectionId })) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to manage missions of team ${convocation.teamId}`)
    }

    const label = input.label.trim()
    if (!isValidMissionLabel(label) || !isValidMissionCapacity(input.capacity)) {
      throw new InvalidMissionTemplateError('label is required and capacity must be between 1 and 3')
    }

    return this.missionRepository.addAdHoc({ convocationId: input.convocationId, label, capacity: input.capacity })
  }
}
