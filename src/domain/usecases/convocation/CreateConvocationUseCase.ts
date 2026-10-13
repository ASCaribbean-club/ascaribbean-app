import type { CompetitionType } from '@domain/entities/competition-type'
import type { Convocation } from '@domain/entities/convocation'
import { ConvocationAttendeeCapExceededError } from '@domain/errors/convocation-attendee-cap-exceeded-error'
import { ConvocationCreationWindowClosedError } from '@domain/errors/convocation-creation-window-closed-error'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { InvalidConvocationInputError } from '@domain/errors/invalid-convocation-input-error'
import { InvalidScheduleError } from '@domain/errors/invalid-schedule-error'
import { InvalidTrainingLocationInputError } from '@domain/errors/invalid-training-location-input-error'
import { can } from '@domain/policies/can'
import { getConvocationCreationWindow } from '@domain/policies/convocation-creation-window'
import { hasMinimumAttendees, isWithinAttendeeCap } from '@domain/policies/convocation-attendee-rules'
import { isValidMatchSchedule } from '@domain/policies/match-scheduling-rules'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import type { UserRepository } from '@domain/repositories/user-repository'

interface CreateConvocationBaseInput {
  teamId: string
  createdBy: string
  date: string // ISO — kickoff (match) / start time (training, meeting)
  // specs/convocation-player-selection.md §2 — the convoked players, written
  // in the same transaction as the convocation (create_*_convocation). Players
  // of the team only: the database refuses anyone else (AC-CPS-04). At least
  // one (PO-CPS-10, hypothesis).
  attendeeIds: string[]
}

// specs/web-localizations.md §2.3/AC-WL-10 — a training references its
// venue by id (training_locations), no longer by free text. Match and
// meeting keep their free-text `location`.
export interface CreateTrainingConvocationInput extends CreateConvocationBaseInput {
  type: 'training'
  trainingLocationId: string
}

export interface CreateMatchConvocationInput extends CreateConvocationBaseInput {
  type: 'match'
  location: string
  opponentId: string
  isHome: boolean
  // specs/convocation-player-selection.md AC-CPS-05 — mandatory, no default:
  // the form refuses to submit until the coach chooses (PO-CPS-10).
  competitionType: CompetitionType
  // Coach feedback (2026-09-25): both optional — a coach may create a match
  // without knowing the RDV yet. `isValidMatchSchedule` (§5, PO-CV-09) below
  // only applies when a meeting point time is actually provided.
  meetingPointTime: string | null // ISO — the "RDV" time
  meetingPointLocation: string | null
}

export interface CreateMeetingConvocationInput extends CreateConvocationBaseInput {
  type: 'meeting'
  location: string
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
    // Injected so the creation-window boundaries are testable; the policy
    // functions themselves never read the clock.
    private readonly now: () => Date = () => new Date(),
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

    // Creation window (domain/policies/convocation-creation-window.ts) —
    // enforced here only, not in RLS: the closed response window is the same
    // accepted risk as the player response deadline. Only the PERMISSION to
    // create after kickoff is mirrored in RLS (convocations_insert_create).
    //   open            -> allowed for anyone holding 'convocation:create'
    //   response_closed -> refused for everyone, admin included
    //   retroactive     -> admin only ('convocation:create_retroactive')
    const creationWindow = getConvocationCreationWindow(input.type, new Date(input.date), this.now())
    if (creationWindow === 'response_closed') {
      throw new ConvocationCreationWindowClosedError(
        `Player responses are already closed for a ${input.type} starting at ${input.date}`,
      )
    }
    if (creationWindow === 'retroactive' && !can(user, 'convocation:create_retroactive')) {
      throw new ForbiddenError(
        `User ${input.createdBy} is not authorized to create a convocation in the past: ${input.date}`,
      )
    }

    // specs/convocation-player-selection.md §2 — the list of convoked players.
    // Duplicates collapse (the list holds one row per player); at least one
    // (PO-CPS-10); at most 14 for an official match (AC-CPS-06, rule
    // 'convocation-attendees:official-match-cap' — the database trigger is the
    // authority, this is the readable mirror). Team membership of each id is
    // the database's check (trigger convocation_attendees_must_be_team_player).
    const attendeeCount = new Set(input.attendeeIds).size
    if (!hasMinimumAttendees(attendeeCount)) {
      throw new InvalidConvocationInputError('A convocation needs at least one convoked player')
    }
    if (!isWithinAttendeeCap(attendeeCount, input.type, input.type === 'match' ? input.competitionType : null)) {
      throw new ConvocationAttendeeCapExceededError(
        `An official match holds at most 14 convoked players, got ${attendeeCount}`,
      )
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
        // specs/web-localizations.md §2.3 — refused before any network call
        // when no venue id was supplied. The "archived venue" refusal is the
        // database's (BEFORE INSERT trigger), surfaced as
        // TrainingLocationArchivedError — never re-checked here against a
        // possibly stale client-side list.
        if (!input.trainingLocationId) {
          throw new InvalidTrainingLocationInputError('trainingLocationId is required for a training')
        }
        return this.convocationRepository.createTraining(input)
      default: {
        const _exhaustive: never = input
        throw new Error(`Unhandled convocation input ${_exhaustive}`)
      }
    }
  }
}