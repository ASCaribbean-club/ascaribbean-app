import type { UserRepository } from '@/domain/repositories/user-repository'
import type { ConvocationResponse, DeclaredStatus } from '@/domain/entities/convocation'
import type { ConvocationRepository } from '@/domain/repositories/convocation-repository'
import type { ConvocationResponseRepository } from '@/domain/repositories/convocation-response-repository'
import { ForbiddenError } from '@/domain/errors/forbidden-error'
import { can } from '@/domain/policies/can'
import { canPlayerRespond } from '@/domain/policies/response-deadline'
import { NotFoundError } from '@/domain/errors/not-found-error'

export interface RespondToConvocationInput {
  convocationId: string
  userId: string
  // Only the two values a player can actually pick — 'pending' is never a
  // player-chosen value, it's the absence of a response (see
  // UpcomingConvocationForPlayer.myResponse being `null` in that case).
  status: Extract<DeclaredStatus, 'present' | 'absent'>
  now: Date
}

// specs/player-dashboard.md §1 point 4 — the one real business action on
// this screen. AC-PD-04: upsert on (convocation_id, user_id), last-value-
// wins (CLAUDE.md §6) — never a second row, even for the two-steps-turned-
// one-tap "Absent" flow (UI design §4).
export class RespondToConvocationUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly convocationRepository: ConvocationRepository,
    private readonly convocationResponseRepository: ConvocationResponseRepository,
  ) { }

  async execute(input: RespondToConvocationInput): Promise<ConvocationResponse> {
    const user = await this.userRepository.findById(input.userId)
    if (!user) {
      throw new NotFoundError(`User ${input.userId} not found.`)
    }

    const convocation = await this.convocationRepository.findById(input.convocationId)
    if (!convocation) {
      throw new NotFoundError(`Convocation ${input.convocationId} not found.`)
    }

    const canRespond = can(user, 'convocation:respond', {
      teamId: convocation.teamId
    })

    if (!canRespond) {
      throw new ForbiddenError(
        `User ${input.userId} is not authorized to respond to convocation with id ${input.convocationId} for convocation assigned to team ${convocation.teamId} `,
      )
    }

    const canPlayerRespondNow = canPlayerRespond(convocation, input.now)
    if (!canPlayerRespondNow) {
      throw new ForbiddenError(
        `User ${input.userId} cannot respond anymore to convocation ${input.convocationId} at this time : ${input.now} due to convocation date of ${convocation.date}`,
      )
    }

    return this.convocationResponseRepository.upsert({
      convocationId: convocation.id,
      userId: user.id,
      status: input.status,
      reason: null,
      respondedAt: input.now.toISOString()

    })
  }
}
