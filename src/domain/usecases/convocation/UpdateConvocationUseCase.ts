import type { Convocation } from '@domain/entities/convocation'
import { ConvocationNotEditableError } from '@domain/errors/convocation-not-editable-error'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { InvalidConvocationInputError } from '@domain/errors/invalid-convocation-input-error'
import { InvalidScheduleError } from '@domain/errors/invalid-schedule-error'
import { InvalidTrainingLocationInputError } from '@domain/errors/invalid-training-location-input-error'
import { NotFoundError } from '@domain/errors/not-found-error'
import { can } from '@domain/policies/can'
import { isConvocationEditable } from '@domain/policies/convocation-admin-windows'
import { isValidMatchSchedule } from '@domain/policies/match-scheduling-rules'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { OpponentRepository } from '@domain/repositories/opponent-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { isPastDate } from '@domain/rules/convocation-rules'

// specs/web-create-convocation.md §1 point 5 / §3 — the name reserved since
// specs/create-convocation.md §7. Input is a union discriminated by `type`:
// each variant carries ONLY the fields its type lets an admin change (§1
// table), never the whole entity. `teamId` and `type` are deliberately not
// editable: `type` below is only a discriminator that must match the stored
// one, `teamId` is absent altogether.
interface UpdateConvocationBaseInput {
  actorId: string
  convocationId: string
  date: string // ISO — new kickoff / start time
  // Passed in, never `new Date()` here (CLAUDE.md §3, same convention as
  // UpdateMatchDetailsUseCase).
  now: Date
}

export interface UpdateTrainingConvocationInput extends UpdateConvocationBaseInput {
  type: 'training'
  trainingLocationId: string
}

export interface UpdateMatchConvocationInput extends UpdateConvocationBaseInput {
  type: 'match'
  location: string
  opponentId: string
  isHome: boolean
  meetingPointTime: string | null
  meetingPointLocation: string | null
}

export interface UpdateMeetingConvocationInput extends UpdateConvocationBaseInput {
  type: 'meeting'
  location: string
  title: string
  agenda: string[]
}

export type UpdateConvocationUseCaseInput =
  | UpdateTrainingConvocationInput
  | UpdateMatchConvocationInput
  | UpdateMeetingConvocationInput

// What the repository receives: the validated, normalized fields of the
// variant, without the actor/clock plumbing.
export type UpdateTrainingConvocationPayload = Omit<UpdateTrainingConvocationInput, 'actorId' | 'now'>
export type UpdateMatchConvocationPayload = Omit<UpdateMatchConvocationInput, 'actorId' | 'now'>
export type UpdateMeetingConvocationPayload = Omit<UpdateMeetingConvocationInput, 'actorId' | 'now'>

// Application-level re-check of rules the database ALSO enforces (RLS window,
// triggers): the database stays the real barrier, this gives a readable error
// before any write (AC-WC-18/19/22). No audit entry is written for a
// convocation modification: PO-WC-07 (convocation.created/updated) is still
// open and not resolved here (specs/web-create-convocation.md §4).
export class UpdateConvocationUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly convocationRepository: ConvocationRepository,
    private readonly opponentRepository: OpponentRepository,
  ) {}

  async execute(input: UpdateConvocationUseCaseInput): Promise<Convocation> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) throw new ForbiddenError(`User not found: ${input.actorId}`)

    const convocation = await this.convocationRepository.findById(input.convocationId)
    if (!convocation) throw new NotFoundError(`Convocation ${input.convocationId} not found.`)

    // Authorization, per written resource: `convocations` (date, location,
    // training location) is 'convocation:update'; the satellites have their
    // own action ('match_details:update' / 'meeting_details:update').
    const context = { teamId: convocation.teamId }
    const requiredActions =
      input.type === 'match'
        ? (['convocation:update', 'match_details:update'] as const)
        : input.type === 'meeting'
          ? (['convocation:update', 'meeting_details:update'] as const)
          : (['convocation:update'] as const)
    for (const action of requiredActions) {
      if (!can(user, action, context)) {
        throw new ForbiddenError(`User ${input.actorId} is not authorized (${action}) on convocation ${input.convocationId}`)
      }
    }

    // `type` is the convocation's identity (§1): refused, never "converted".
    if (convocation.type !== input.type) {
      throw new InvalidConvocationInputError(
        `Convocation ${input.convocationId} is a ${convocation.type}, its type cannot be changed.`,
      )
    }

    // Window, evaluated at the instant of the write against the ORIGINAL
    // convocation (AC-WC-23), then the NEW date must not be in the past.
    if (!isConvocationEditable(convocation, input.now)) {
      throw new ConvocationNotEditableError(`Convocation ${input.convocationId} is past or no longer open.`)
    }
    if (isPastDate(input.date, input.now)) {
      throw new InvalidConvocationInputError(`The new date is in the past: ${input.date}`)
    }

    switch (input.type) {
      case 'training': {
        if (!input.trainingLocationId) {
          throw new InvalidTrainingLocationInputError('trainingLocationId is required for a training')
        }
        // The "archived venue" refusal is the database's (trigger extended to
        // update), never re-checked here against a possibly stale list.
        return this.convocationRepository.updateTraining({
          convocationId: input.convocationId,
          type: 'training',
          date: input.date,
          trainingLocationId: input.trainingLocationId,
        })
      }
      case 'match': {
        const location = input.location.trim()
        if (!location) throw new InvalidConvocationInputError('location is required for a match')

        // AC-WC-19 — the opponent must be one of the team's own opponents.
        const opponents = await this.opponentRepository.findByTeamId(convocation.teamId)
        if (!opponents.some((opponent) => opponent.id === input.opponentId)) {
          throw new InvalidConvocationInputError(`Opponent ${input.opponentId} does not belong to team ${convocation.teamId}`)
        }

        // AC-WC-22 — the RDV is validated against the NEW kickoff, only when set.
        if (input.meetingPointTime) {
          if (!isValidMatchSchedule(new Date(input.meetingPointTime), new Date(input.date))) {
            throw new InvalidScheduleError(`Meeting point time is not before kickoff, the same day: ${input.convocationId}`)
          }
        }
        return this.convocationRepository.updateMatch({
          convocationId: input.convocationId,
          type: 'match',
          date: input.date,
          location,
          opponentId: input.opponentId,
          isHome: input.isHome,
          meetingPointTime: input.meetingPointTime || null,
          meetingPointLocation: input.meetingPointLocation?.trim() || null,
        })
      }
      case 'meeting': {
        const title = input.title.trim()
        if (!title) throw new InvalidConvocationInputError('title is required for a meeting')
        const location = input.location.trim()
        if (!location) throw new InvalidConvocationInputError('location is required for a meeting')

        return this.convocationRepository.updateMeeting({
          convocationId: input.convocationId,
          type: 'meeting',
          date: input.date,
          location,
          title,
          // Ordered list, empty list admitted; blank points are dropped.
          agenda: input.agenda.map((point) => point.trim()).filter((point) => point !== ''),
        })
      }
      default: {
        const _exhaustive: never = input
        throw new Error(`Unhandled convocation input ${_exhaustive}`)
      }
    }
  }
}
