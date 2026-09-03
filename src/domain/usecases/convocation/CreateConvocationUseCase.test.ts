import { describe, expect, it, vi } from 'vitest'
import type { Convocation, ConvocationType } from '../../entities/convocation'
import type { Team } from '../../entities/team'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
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

const FUTURE_DATE = '2026-09-05T15:00:00.000Z'

function coachUser(teamIds: string[]): User {
  return {
    id: 'coach-1',
    fullName: 'Coach',
    email: 'coach@example.com',
    roles: [{ role: 'coach', teamIds }],
    position: null,
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
  }
}

function fakeTeamRepository(teams: Team[]): TeamRepository {
  return {
    findByIds: async () => teams,
    countActiveMembers: async () => 0,
    findById: async () => teams[0] ?? null,
  }
}

function convocationFrom(input: {
  teamId: string
  createdBy: string
  date: string
  location: string
  type: ConvocationType
}): Convocation {
  return {
    id: 'convocation-1',
    teamId: input.teamId,
    type: input.type,
    date: input.date,
    location: input.location,
    status: 'open',
    closedAt: null,
    closedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    createdBy: input.createdBy,
  }
}

function fakeConvocationRepository(overrides: Partial<ConvocationRepository> = {}): ConvocationRepository {
  return {
    listForTeam: async () => [],
    findById: async () => null,
    createTraining: async (input) => convocationFrom(input),
    createMatch: async (input) => convocationFrom(input),
    createMeeting: async (input) => convocationFrom(input),
    ...overrides,
  }
}

function trainingInput(overrides: Partial<CreateTrainingConvocationInput> = {}): CreateTrainingConvocationInput {
  return {
    type: 'training',
    teamId: 'team-1',
    createdBy: 'coach-1',
    date: FUTURE_DATE,
    location: 'Gymnase municipal',
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
    meetingPointTime: '2026-09-05T13:30:00.000Z',
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

  it('throws when the date is in the past', async () => {
    const useCase = new CreateConvocationUseCase(
      fakeUserRepository(coachUser(['team-1'])),
      fakeTeamRepository([teamWith('team-1')]),
      fakeConvocationRepository(),
    )

    await expect(useCase.execute(trainingInput({ date: '2020-01-01T10:00:00.000Z' }))).rejects.toThrow()
  })

  it('throws InvalidScheduleError when the RDV time is not before kickoff', async () => {
    const useCase = new CreateConvocationUseCase(
      fakeUserRepository(coachUser(['team-1'])),
      fakeTeamRepository([teamWith('team-1')]),
      fakeConvocationRepository(),
    )

    await expect(useCase.execute(matchInput({ meetingPointTime: '2026-09-05T16:00:00.000Z' }))).rejects.toThrow(
      InvalidScheduleError,
    )
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