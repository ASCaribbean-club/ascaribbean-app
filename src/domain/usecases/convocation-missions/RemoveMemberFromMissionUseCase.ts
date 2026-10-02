import { ForbiddenError } from '@domain/errors/forbidden-error'
import { can } from '@domain/policies/can'
import type { ConvocationMissionRepository } from '@domain/repositories/convocation-mission-repository'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { loadMissionContext } from './mission-context'

export interface RemoveMemberFromMissionInput {
  actorId: string
  convocationId: string
  missionId: string
  targetUserId: string
}

// specs/match-details-missions.md §2.4 — a manager removes a member. No
// deadline. Mirrors the manager delete policy of mission_assignments.
export class RemoveMemberFromMissionUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly convocationRepository: ConvocationRepository,
    private readonly teamRepository: TeamRepository,
    private readonly missionRepository: ConvocationMissionRepository,
  ) {}

  async execute(input: RemoveMemberFromMissionInput): Promise<void> {
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

    await this.missionRepository.release(input.missionId, input.targetUserId)
  }
}
