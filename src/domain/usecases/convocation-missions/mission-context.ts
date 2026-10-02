import type { Convocation } from '@domain/entities/convocation'
import type { User } from '@domain/entities/user'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { NotFoundError } from '@domain/errors/not-found-error'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import type { UserRepository } from '@domain/repositories/user-repository'

export interface MissionContext {
  user: User
  convocation: Convocation
  // Resolved from the team like CreateConvocationUseCase does; undefined when
  // the team is unknown (can() then refuses a section-manager).
  sectionId: string | undefined
}

// Shared first step of every write use case of this folder: load the actor
// and the convocation, resolve teamId/sectionId. can() is applied by the
// caller, BEFORE any business rule.
export async function loadMissionContext(
  userRepository: UserRepository,
  convocationRepository: ConvocationRepository,
  teamRepository: TeamRepository,
  actorId: string,
  convocationId: string,
): Promise<MissionContext> {
  const user = await userRepository.findById(actorId)
  if (!user) {
    throw new ForbiddenError(`User not found: ${actorId}`)
  }
  const convocation = await convocationRepository.findById(convocationId)
  if (!convocation) {
    throw new NotFoundError(`Convocation not found: ${convocationId}`)
  }
  const team = await teamRepository.findById(convocation.teamId)
  return { user, convocation, sectionId: team?.sectionId }
}
