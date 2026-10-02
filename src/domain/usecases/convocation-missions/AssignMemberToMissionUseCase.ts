import type { MissionAssignment } from '@domain/entities/convocation-mission'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { can } from '@domain/policies/can'
import { isEligibleMissionAssignee } from '@domain/policies/mission-rules'
import type { ConvocationMissionRepository } from '@domain/repositories/convocation-mission-repository'
import type { ConvocationRespondersRepository } from '@domain/repositories/convocation-responders-repository'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { loadMissionContext } from './mission-context'

export interface AssignMemberToMissionInput {
  actorId: string
  convocationId: string
  missionId: string
  targetUserId: string
}

// specs/match-details-missions.md §2.4 — a manager registers an eligible
// member. No deadline. Capacity is held by claim_mission (R2). Mirrors the
// manager branch of claim_mission ('mission:manage').
export class AssignMemberToMissionUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly convocationRepository: ConvocationRepository,
    private readonly teamRepository: TeamRepository,
    private readonly respondersRepository: ConvocationRespondersRepository,
    private readonly missionRepository: ConvocationMissionRepository,
  ) {}

  async execute(input: AssignMemberToMissionInput): Promise<MissionAssignment> {
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

    const roster = await this.respondersRepository.listForConvocation(input.convocationId)
    if (!isEligibleMissionAssignee(input.targetUserId, roster.map((member) => member.userId))) {
      throw new ForbiddenError(`User ${input.targetUserId} is not eligible for missions of convocation ${input.convocationId}`)
    }

    return this.missionRepository.claim(input.missionId, input.targetUserId)
  }
}
