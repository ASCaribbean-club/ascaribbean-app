import { describe, expect, it, vi } from 'vitest'
import type { Convocation, ConvocationType } from '../../entities/convocation'
import type { Team } from '../../entities/team'
import type { User } from '../../entities/user'
import { ConvocationCreationWindowClosedError } from '../../errors/convocation-creation-window-closed-error'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidTrainingLocationInputError } from '../../errors/invalid-training-location-input-error'
import { InvalidScheduleError } from '../../errors/invalid-schedule-error'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { TeamRepository } from '../../repositories/team-repository'
import type { UserRepository } from '../../repositories/user-repository'
import {
  CreateConvocationUseCase,
  type CreateMatchConvocationInput,
  type CreateMeetingConvocationInput,
  type CreateTrainingConvocationInput,
} from './CreateConvocationUseCase'

// Relative to Date.now(), not a fixed calendar date — a hardcoded future
// date eventually becomes past and these tests start failing on the
// isPastDate guard for reasons unrelated to what they're testing.
const FUTURE_KICKOFF = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
FUTURE_KICKOFF.setUTCHours(15, 0, 0, 0)
const FUTURE_DATE = FUTURE_KICKOFF.toISOString()

function timeOnFutureDate(hours: number, minutes = 0): string {
  const d = new Date(FUTURE_KICKOFF)
  d.setUTCHours(hours, minutes, 0, 0)
  return d.toISOString()
}

function coachUser(teamIds: string[]): User {
  return {
    id: 'coach-1',
    fullName: 'Coach',
    email: 'coach@example.com',
    roles: [{ role: 'coach', teamIds }],
    position: null,
    age: null,
    handedness: null,
    charterAcceptedAt: new Date('2026-01-01T00:00:00.000Z'),
  }
}

function adminUser(): User {
  return {
    id: 'admin-1',
    fullName: 'Admin',
    email: 'admin@example.com',
    roles: [{ role: 'admin' }],
    position: null,
    age: null,
    handedness: null,
    charterAcceptedAt: new Date('2026-01-01T00:00:00.000Z'),
  }
}

function sectionManagerUser(sectionId: string): User {
  return {
    id: 'manager-1',
    fullName: 'Section Manager',
    email: 'manager@example.com',
    roles: [{ role: 'section-manager', sectionId }],
    position: null,
    age: null,
    handedness: null,
    charterAcceptedAt: new Date('2026-01-01T00:00:00.000Z'),
  }
}

function teamWith(id: string, sectionId = 'section-1'): Team {
  return { id, name: 'Team', sectionId, seasonId: 'season-1' }
}

function fakeUserRepository(user: User | null): UserRepository {
  return {
    findById: async () => user,
    acceptCharter: async () => {},
    findAll: async () => [],
    // specs/web-users.md §2.10 — added by that feature to UserRepository,
    // unrelated to this test's own assertions; stubbed so the fake keeps
    // satisfying the interface.
    findAdminDirectory: async () => [],
    findMissingElementFacts: async () => [],
    updateProfile: async () => {},
    invite: async () => ({ url: 'https://app.example.com/activation?token_hash=fake&type=invite' }),
    reissueInvitationLink: async () => ({ url: 'https://app.example.com/activation?token_hash=fake&type=magiclink' }),
    generatePasswordResetLink: async () => ({ url: 'https://app.example.com/update-password?token_hash=fake&type=recovery' }),
  }
}

function fakeTeamRepository(teams: Team[]): TeamRepository {
  return {
    findByIds: async () => teams,
    countActiveMembers: async () => 0,
    findById: async () => teams[0] ?? null,
    findAllForAdmin: async () => teams,
    create: async () => {
      throw new Error('not implemented')
    },
    update: async () => {
      throw new Error('not implemented')
    },
  }
}

function convocationFrom(input: {
  teamId: string
  createdBy: string
  date: string
  location?: string
  trainingLocationId?: string
  type: ConvocationType
}): Convocation {
  return {
    id: 'convocation-1',
    teamId: input.teamId,
    type: input.type,
    date: input.date,
    location: input.location ?? null,
    trainingLocation: input.trainingLocationId
      ? { id: input.trainingLocationId, name: 'Terrain A', address: '1 rue du Stade', isArchived: false }
      : null,
    status: 'open',
    closedAt: null,
    closedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    createdBy: input.createdBy,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

function fakeConvocationRepository(overrides: Partial<ConvocationRepository> = {}): ConvocationRepository {
  return {
    listForTeam: async () => [],
    findById: async () => null,
    createTraining: async (input) => convocationFrom(input),
    createMatch: async (input) => convocationFrom(input),
    createMeeting: async (input) => convocationFrom(input),
    updateArrangements: async () => { throw new Error('not used in this test') },
    updateTraining: async () => { throw new Error('not used in this test') },
    updateMatch: async () => { throw new Error('not used in this test') },
    updateDate: async () => { throw new Error('not used in this test') },
    updateMeeting: async () => { throw new Error('not used in this test') },
    delete: async () => { throw new Error('not used in this test') },
    ...overrides,
  }
}

function trainingInput(overrides: Partial<CreateTrainingConvocationInput> = {}): CreateTrainingConvocationInput {
  return {
    type: 'training',
    teamId: 'team-1',
    createdBy: 'coach-1',
    date: FUTURE_DATE,
    trainingLocationId: 'training-location-1',
    ...overrides,
  }
}

function matchInput(overrides: Partial<CreateMatchConvocationInput> = {}): CreateMatchConvocationInput {
  return {
    type: 'match',
    teamId: 'team-1',
    createdBy: 'coach-1',
    date: FUTURE_DATE,
    location: 'Stade municipal',
    opponentId: 'opponent-1',
    isHome: true,
    meetingPointTime: timeOnFutureDate(13, 30),
    meetingPointLocation: 'Vestiaires',
    ...overrides,
  }
}

function meetingInput(overrides: Partial<CreateMeetingConvocationInput> = {}): CreateMeetingConvocationInput {
  return {
    type: 'meeting',
    teamId: 'team-1',
    createdBy: 'coach-1',
    date: FUTURE_DATE,
    location: 'Salle de réunion',
    title: 'Réunion de rentrée',
    agenda: ['Objectifs de la saison'],
    ...overrides,
  }
}

describe('CreateConvocationUseCase', () => {
  it('throws ForbiddenError when the user does not exist', async () => {
    const useCase = new CreateConvocationUseCase(
      fakeUserRepository(null),
      fakeTeamRepository([teamWith('team-1')]),
      fakeConvocationRepository(),
    )

    await expect(useCase.execute(trainingInput())).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when the user is not authorized for the target team', async () => {
    const useCase = new CreateConvocationUseCase(
      fakeUserRepository(coachUser(['other-team'])),
      fakeTeamRepository([teamWith('team-1')]),
      fakeConvocationRepository(),
    )

    await expect(useCase.execute(trainingInput())).rejects.toThrow(ForbiddenError)
  })

  // Use case comment: "undefined if team doesn't exist — can() resolves this
  // to false for section-manager, matching the absence = refusal decision."
  // A coach's own authorization check doesn't depend on team existence
  // (only on teamIds membership), so section-manager is the role that
  // actually exercises this path.
  it('throws ForbiddenError when the target team does not exist', async () => {
    const useCase = new CreateConvocationUseCase(
      fakeUserRepository(sectionManagerUser('section-1')),
      fakeTeamRepository([]),
      fakeConvocationRepository(),
    )

    await expect(useCase.execute(trainingInput({ createdBy: 'manager-1' }))).rejects.toThrow(ForbiddenError)
  })

  // Creation window — a training's response deadline is 10 min before start.
  describe('creation window', () => {
    const KICKOFF = '2026-08-10T18:00:00.000Z'
    const clockAt = (iso: string) => () => new Date(iso)

    function useCaseFor(user: User, nowIso: string) {
      return new CreateConvocationUseCase(
        fakeUserRepository(user),
        fakeTeamRepository([teamWith('team-1')]),
        fakeConvocationRepository(),
        clockAt(nowIso),
      )
    }

    it('creates a convocation before the response deadline', async () => {
      const useCase = useCaseFor(coachUser(['team-1']), '2026-08-10T17:49:00.000Z')
      await expect(useCase.execute(trainingInput({ date: KICKOFF }))).resolves.toBeDefined()
    })

    it('refuses a coach inside the closed response window', async () => {
      const useCase = useCaseFor(coachUser(['team-1']), '2026-08-10T17:50:00.000Z')
      await expect(useCase.execute(trainingInput({ date: KICKOFF }))).rejects.toThrow(
        ConvocationCreationWindowClosedError,
      )
    })

    it('refuses an admin too inside the closed response window', async () => {
      const useCase = useCaseFor(adminUser(), '2026-08-10T17:59:00.000Z')
      await expect(useCase.execute(trainingInput({ date: KICKOFF, createdBy: 'admin-1' }))).rejects.toThrow(
        ConvocationCreationWindowClosedError,
      )
    })

    it('refuses a retroactive creation by a coach, with no repository call', async () => {
      const createTraining = vi.fn()
      const useCase = new CreateConvocationUseCase(
        fakeUserRepository(coachUser(['team-1'])),
        fakeTeamRepository([teamWith('team-1')]),
        fakeConvocationRepository({ createTraining }),
        clockAt('2026-08-10T18:00:00.000Z'),
      )
      await expect(useCase.execute(trainingInput({ date: KICKOFF }))).rejects.toThrow(ForbiddenError)
      expect(createTraining).not.toHaveBeenCalled()
    })

    it('accepts a retroactive creation by an admin', async () => {
      const useCase = useCaseFor(adminUser(), '2026-08-12T09:00:00.000Z')
      await expect(useCase.execute(trainingInput({ date: KICKOFF, createdBy: 'admin-1' }))).resolves.toBeDefined()
    })
  })

  it('throws InvalidScheduleError when the RDV time is not before kickoff', async () => {
    const useCase = new CreateConvocationUseCase(
      fakeUserRepository(coachUser(['team-1'])),
      fakeTeamRepository([teamWith('team-1')]),
      fakeConvocationRepository(),
    )

    await expect(
      useCase.execute(matchInput({ meetingPointTime: timeOnFutureDate(16, 0) })),
    ).rejects.toThrow(InvalidScheduleError)
  })

  it('creates a training convocation via ConvocationRepository.createTraining', async () => {
    const createTraining = vi.fn(async (input: CreateTrainingConvocationInput) => convocationFrom(input))
    const useCase = new CreateConvocationUseCase(
      fakeUserRepository(coachUser(['team-1'])),
      fakeTeamRepository([teamWith('team-1')]),
      fakeConvocationRepository({ createTraining }),
    )

    const result = await useCase.execute(trainingInput())

    expect(createTraining).toHaveBeenCalledTimes(1)
    expect(result.type).toBe('training')
  })

  // specs/web-localizations.md §2.3/AC-WL-10 — a training carries the venue
  // id, never free text, and a missing id is refused before any network call.
  it('passes the trainingLocationId through to ConvocationRepository.createTraining', async () => {
    const createTraining = vi.fn(async (input: CreateTrainingConvocationInput) => convocationFrom(input))
    const useCase = new CreateConvocationUseCase(
      fakeUserRepository(coachUser(['team-1'])),
      fakeTeamRepository([teamWith('team-1')]),
      fakeConvocationRepository({ createTraining }),
    )

    const result = await useCase.execute(trainingInput({ trainingLocationId: 'training-location-9' }))

    expect(createTraining).toHaveBeenCalledWith(expect.objectContaining({ trainingLocationId: 'training-location-9' }))
    expect(result.trainingLocation?.id).toBe('training-location-9')
  })

  it('refuses a training without trainingLocationId, with no repository call', async () => {
    const createTraining = vi.fn(async (input: CreateTrainingConvocationInput) => convocationFrom(input))
    const useCase = new CreateConvocationUseCase(
      fakeUserRepository(coachUser(['team-1'])),
      fakeTeamRepository([teamWith('team-1')]),
      fakeConvocationRepository({ createTraining }),
    )

    await expect(useCase.execute(trainingInput({ trainingLocationId: '' }))).rejects.toBeInstanceOf(InvalidTrainingLocationInputError)
    expect(createTraining).not.toHaveBeenCalled()
  })

  it('creates a match convocation via ConvocationRepository.createMatch', async () => {
    const createMatch = vi.fn(async (input: CreateMatchConvocationInput) => convocationFrom(input))
    const useCase = new CreateConvocationUseCase(
      fakeUserRepository(coachUser(['team-1'])),
      fakeTeamRepository([teamWith('team-1')]),
      fakeConvocationRepository({ createMatch }),
    )

    const result = await useCase.execute(matchInput())

    expect(createMatch).toHaveBeenCalledTimes(1)
    expect(result.type).toBe('match')
  })

  // Coach feedback (2026-09-25) — RDV (meeting point) is optional: a coach
  // may create a match without knowing it yet, and no schedule validation
  // applies when it's absent.
  it('creates a match convocation with no RDV set, without running isValidMatchSchedule', async () => {
    const createMatch = vi.fn(async (input: CreateMatchConvocationInput) => convocationFrom(input))
    const useCase = new CreateConvocationUseCase(
      fakeUserRepository(coachUser(['team-1'])),
      fakeTeamRepository([teamWith('team-1')]),
      fakeConvocationRepository({ createMatch }),
    )

    const result = await useCase.execute(matchInput({ meetingPointTime: null, meetingPointLocation: null }))

    expect(createMatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ meetingPointTime: null, meetingPointLocation: null }),
    )
    expect(result.type).toBe('match')
  })

  it('creates a meeting convocation via ConvocationRepository.createMeeting', async () => {
    const createMeeting = vi.fn(async (input: CreateMeetingConvocationInput) => convocationFrom(input))
    const useCase = new CreateConvocationUseCase(
      fakeUserRepository(coachUser(['team-1'])),
      fakeTeamRepository([teamWith('team-1')]),
      fakeConvocationRepository({ createMeeting }),
    )

    const result = await useCase.execute(meetingInput())

    expect(createMeeting).toHaveBeenCalledTimes(1)
    expect(result.type).toBe('meeting')
  })
})