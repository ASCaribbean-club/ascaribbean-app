import type { Convocation } from '@domain/entities/convocation'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { InvalidScheduleError } from '@domain/errors/invalid-schedule-error'
import { can } from '@domain/policies/can'
import { isValidMatchSchedule } from '@domain/policies/match-scheduling-rules'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { isPastDate } from '@domain/rules/convocation-rules'

interface CreateConvocationBaseInput {
  teamId: string
  createdBy: string
  date: string // ISO — kickoff (match) / start time (training, meeting)
  location: string
}

export interface CreateTrainingConvocationInput extends CreateConvocationBaseInput {
  type: 'training'
}

export interface CreateMatchConvocationInput extends CreateConvocationBaseInput {
  type: 'match'
  opponentId: string
  isHome: boolean
  // Coach feedback (2026-09-25): both optional — a coach may create a match
  // without knowing the RDV yet. `isValidMatchSchedule` (§5, PO-CV-09) below
  // only applies when a meeting point time is actually provided.
  meetingPointTime: string | null // ISO — the "RDV" time
  meetingPointLocation: string | null
}

export interface CreateMeetingConvocationInput extends CreateConvocationBaseInput {
  type: 'meeting'
  title: string
  agenda: string[]
}

// Discriminated on `type` — every type-specific field is required within its
// own variant, so a `type: 'match'` input missing `meetingPointTime` (or a
// `type: 'training'` input carrying `title`) is a compile error, not a
// silent runtime gap.
export type CreateConvocationUseCaseInput =
  | CreateTrainingConvocationInput
  | CreateMatchConvocationInput
  | CreateMeetingConvocationInput

export class CreateConvocationUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly teamRepository: TeamRepository,
    private readonly convocationRepository: ConvocationRepository,
  ) { }

  async execute(input: CreateConvocationUseCaseInput): Promise<Convocation> {
    // Authorization first — before any business-rule validation, so an
    // unauthorized caller never learns anything about schedule conflicts,
    // past dates, etc. for a team/section they have no right to touch.
    const user = await this.userRepository.findById(input.createdBy)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.createdBy}`)
    }

    const team = await this.teamRepository.findById(input.teamId)

    const canCreate = can(user, 'convocation:create', {
      teamId: input.teamId,
      sectionId: team?.sectionId, // undefined if team doesn't exist — can()
      // resolves this to false for section-manager,
      // matching the "absence = refusal" decision.
    })
    if (!canCreate) {
      throw new ForbiddenError(
        `User ${input.createdBy} is not authorized to create a convocation for team ${input.teamId}`,
      )
    }

    if (isPastDate(input.date, new Date())) {
      throw new Error(`Convocation the user want to create is in the past: ${input.date}`)
    }

    switch (input.type) {
      case 'match': {
        // Only checked when the coach actually provided an RDV time — an
        // absent one has nothing to be "before kickoff" or not (§5, PO-CV-09
        // as relaxed by the RDV-optional decision above).
        if (input.meetingPointTime) {
          const meetingDate = new Date(input.meetingPointTime)
          const matchDate = new Date(input.date)

          if (!isValidMatchSchedule(meetingDate, matchDate)) {
            throw new InvalidScheduleError(`Convocation meeting time is before match start`)
          }
        }
        return this.convocationRepository.createMatch(input)
      }
      case 'meeting':
        return this.convocationRepository.createMeeting(input)
      case 'training':
        return this.convocationRepository.createTraining(input)
      default: {
        const _exhaustive: never = input
        throw new Error(`Unhandled convocation input ${_exhaustive}`)
      }
    }
  }
}