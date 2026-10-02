import { ForbiddenError } from '@domain/errors/forbidden-error'
import { can } from '@domain/policies/can'
import type { ConvocationMissionRepository } from '@domain/repositories/convocation-mission-repository'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { loadMissionContext } from './mission-context'

export interface RemoveMissionInput {
  actorId: string
  convocationId: string
  missionId: string
}

// specs/match-details-missions.md §2.4/R6 — a manager deletes a mission; its
// assignments go with it (cascade, database side). Mirrors the delete policy
// of convocation_missions ('mission:manage').
export class RemoveMissionUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly convocationRepository: ConvocationRepository,
    private readonly teamRepository: TeamRepository,
    private readonly missionRepository: ConvocationMissionRepository,
  ) {}

  async execute(input: RemoveMissionInput): Promise<void> {
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

    await this.missionRepository.remove(input.missionId)
  }
}
