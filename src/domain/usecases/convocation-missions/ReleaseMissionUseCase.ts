import { ForbiddenError } from '@domain/errors/forbidden-error'
import { MissionDeadlinePassedError } from '@domain/errors/mission-deadline-passed-error'
import { can } from '@domain/policies/can'
import { isMissionSelfServiceOpen } from '@domain/policies/mission-deadline'
import { isEligibleMissionAssignee } from '@domain/policies/mission-rules'
import type { ConvocationMissionRepository } from '@domain/repositories/convocation-mission-repository'
import type { ConvocationRespondersRepository } from '@domain/repositories/convocation-responders-repository'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { loadMissionContext } from './mission-context'

export interface ReleaseMissionInput {
  actorId: string
  convocationId: string
  missionId: string
}

// specs/match-details-missions.md §2.4 — a member withdraws THEMSELVES. Same
// checks as ClaimMissionUseCase, minus capacity. Mirrors the self delete
// policy of mission_assignments ('mission:self-assign').
export class ReleaseMissionUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly convocationRepository: ConvocationRepository,
    private readonly teamRepository: TeamRepository,
    private readonly respondersRepository: ConvocationRespondersRepository,
    private readonly missionRepository: ConvocationMissionRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: ReleaseMissionInput): Promise<void> {
    const { user, convocation, sectionId } = await loadMissionContext(
      this.userRepository,
      this.convocationRepository,
      this.teamRepository,
      input.actorId,
      input.convocationId,
    )
    const scope = { teamId: convocation.teamId, sectionId }

    if (!can(user, 'mission:self-assign', scope)) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to withdraw from a mission`)
    }

    const roster = await this.respondersRepository.listForConvocation(input.convocationId)
    if (!isEligibleMissionAssignee(
        input.actorId,
        roster.map((member) => member.userId),
        user.roles.some((assignment) => assignment.role === 'authorized-officer'),
      )) {
      throw new ForbiddenError(`User ${input.actorId} is not eligible for missions of convocation ${input.convocationId}`)
    }

    if (!can(user, 'mission:manage', scope) && !isMissionSelfServiceOpen(convocation, this.now())) {
      throw new MissionDeadlinePassedError(`Mission self-service is closed for convocation ${input.convocationId}`)
    }

    await this.missionRepository.release(input.missionId, input.actorId)
  }
}
