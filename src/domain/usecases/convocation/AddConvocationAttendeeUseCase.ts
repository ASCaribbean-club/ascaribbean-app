import { ConvocationAttendeeAddRefusedError } from '@domain/errors/convocation-attendee-add-refused-error'
import { ConvocationAttendeeCapExceededError } from '@domain/errors/convocation-attendee-cap-exceeded-error'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { InvalidConvocationInputError } from '@domain/errors/invalid-convocation-input-error'
import { NotFoundError } from '@domain/errors/not-found-error'
import { can } from '@domain/policies/can'
import { canAddAnotherAttendee, isAttendeeAddWindowOpen, isConvoked } from '@domain/policies/convocation-attendee-rules'
import type { ConvocationAttendeeRepository } from '@domain/repositories/convocation-attendee-repository'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { ConvocationRespondersRepository } from '@domain/repositories/convocation-responders-repository'
import type { MatchDetailsRepository } from '@domain/repositories/match-details-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import type { UserRepository } from '@domain/repositories/user-repository'

export interface AddConvocationAttendeeInput {
  actorId: string
  convocationId: string
  // The player to convoke.
  userId: string
}

// specs/convocation-player-selection.md §4 — the coach of the team convokes a
// player who is not on the list yet. Order: 'convocation_attendee:add' (before
// any business rule) -> window (PO-CPS-06, open + before kickoff) -> not
// already convoked -> cap of an official match -> write. Writes nothing to
// convocation_responses / attendance_records / the lineup (AC-CPS-19): the
// player simply shows up "en attente". The RLS policy
// convocation_attendees_insert_add and the cap trigger are the real gate; this
// is the UX mirror. `now` is injected so the boundary is testable.
export class AddConvocationAttendeeUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly convocationRepository: ConvocationRepository,
    private readonly teamRepository: TeamRepository,
    private readonly matchDetailsRepository: MatchDetailsRepository,
    private readonly convocationRespondersRepository: ConvocationRespondersRepository,
    private readonly convocationAttendeeRepository: ConvocationAttendeeRepository,
    private readonly now: () => Date = () => new Date(),
  ) { }

  async execute(input: AddConvocationAttendeeInput): Promise<void> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }
    const convocation = await this.convocationRepository.findById(input.convocationId)
    if (!convocation) {
      throw new NotFoundError(`Convocation not found: ${input.convocationId}`)
    }
    const team = await this.teamRepository.findById(convocation.teamId)

    if (!can(user, 'convocation_attendee:add', { teamId: convocation.teamId, sectionId: team?.sectionId })) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to convoke a player for team ${convocation.teamId}`)
    }

    if (!isAttendeeAddWindowOpen(convocation, this.now())) {
      throw new ConvocationAttendeeAddRefusedError(`Convocation ${input.convocationId} no longer accepts convoked players`)
    }

    const convoked = await this.convocationRespondersRepository.listForConvocation(input.convocationId)
    if (isConvoked(input.userId, convoked.map((responder) => responder.userId))) {
      throw new InvalidConvocationInputError(`User ${input.userId} is already convoked`)
    }

    const competitionType =
      convocation.type === 'match'
        ? ((await this.matchDetailsRepository.findByConvocationId(input.convocationId))?.competitionType ?? null)
        : null
    if (!canAddAnotherAttendee(convoked.length, convocation.type, competitionType)) {
      throw new ConvocationAttendeeCapExceededError(
        `Convocation ${input.convocationId} already holds ${convoked.length} convoked players`,
      )
    }

    await this.convocationAttendeeRepository.add(input.convocationId, input.userId)
  }
}
