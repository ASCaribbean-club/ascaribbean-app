import { describe, expect, it, vi } from 'vitest'
import type { Convocation } from '../../entities/convocation'
import type { User } from '../../entities/user'
import { ConvocationNotEditableError } from '../../errors/convocation-not-editable-error'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidConvocationInputError } from '../../errors/invalid-convocation-input-error'
import { InvalidScheduleError } from '../../errors/invalid-schedule-error'
import { InvalidTrainingLocationInputError } from '../../errors/invalid-training-location-input-error'
import { NotFoundError } from '../../errors/not-found-error'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { OpponentRepository } from '../../repositories/opponent-repository'
import type { UserRepository } from '../../repositories/user-repository'
import {
  UpdateConvocationUseCase,
  type UpdateMatchConvocationInput,
  type UpdateMeetingConvocationInput,
  type UpdateTrainingConvocationInput,
} from './UpdateConvocationUseCase'

const NOW = new Date('2026-10-01T12:00:00.000Z')
const FUTURE = '2026-10-05T15:00:00.000Z'
const NEW_FUTURE = '2026-10-06T15:00:00.000Z'

function userWith(roles: User['roles']): User {
  return { id: 'actor-1', fullName: 'Actor', email: 'a@example.com', roles, position: null, age: null, handedness: null, charterAcceptedAt: null }
}
const admin = () => userWith([{ role: 'admin' }])

function convocationOf(type: Convocation['type'], overrides: Partial<Convocation> = {}): Convocation {
  return {
    id: 'convocation-1',
    teamId: 'team-1',
    type,
    date: FUTURE,
    location: type === 'training' ? null : 'Stade',
    trainingLocation: null,
    status: 'open',
    closedAt: null,
    closedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    createdBy: 'creator-1',
    ...overrides,
  }
}

function setup(user: User | null, convocation: Convocation | null, opponentIds: string[] = ['opponent-1']) {
  const updateTraining = vi.fn(async (_payload: unknown) => convocation as Convocation)
  const updateMatch = vi.fn(async (_payload: unknown) => convocation as Convocation)
  const updateMeeting = vi.fn(async (_payload: unknown) => convocation as Convocation)
  const convocationRepository = {
    findById: async () => convocation,
    updateTraining,
    updateMatch,
    updateMeeting,
  } as unknown as ConvocationRepository
  const userRepository = { findById: async () => user } as unknown as UserRepository
  const opponentRepository = {
    findByTeamId: async () => opponentIds.map((id) => ({ id, name: 'Adversaire' })),
  } as unknown as OpponentRepository
  return {
    useCase: new UpdateConvocationUseCase(userRepository, convocationRepository, opponentRepository),
    updateTraining,
    updateMatch,
    updateMeeting,
  }
}

const trainingInput = (overrides: Partial<UpdateTrainingConvocationInput> = {}): UpdateTrainingConvocationInput => ({
  actorId: 'actor-1',
  convocationId: 'convocation-1',
  type: 'training',
  date: NEW_FUTURE,
  trainingLocationId: 'location-1',
  now: NOW,
  ...overrides,
})

const matchInput = (overrides: Partial<UpdateMatchConvocationInput> = {}): UpdateMatchConvocationInput => ({
  actorId: 'actor-1',
  convocationId: 'convocation-1',
  type: 'match',
  date: NEW_FUTURE,
  location: '  Stade municipal ',
  opponentId: 'opponent-1',
  isHome: false,
  meetingPointTime: null,
  meetingPointLocation: null,
  now: NOW,
  ...overrides,
})

const meetingInput = (overrides: Partial<UpdateMeetingConvocationInput> = {}): UpdateMeetingConvocationInput => ({
  actorId: 'actor-1',
  convocationId: 'convocation-1',
  type: 'meeting',
  date: NEW_FUTURE,
  location: 'Salle',
  title: ' Bilan ',
  agenda: ['Point 1', '   ', ' Point 2 '],
  now: NOW,
  ...overrides,
})

describe('UpdateConvocationUseCase', () => {
  describe('authorization and existence', () => {
    it('refuses an unknown actor', async () => {
      const { useCase } = setup(null, convocationOf('training'))
      await expect(useCase.execute(trainingInput())).rejects.toBeInstanceOf(ForbiddenError)
    })

    it('throws NotFoundError for an unknown convocation', async () => {
      const { useCase } = setup(admin(), null)
      await expect(useCase.execute(trainingInput())).rejects.toBeInstanceOf(NotFoundError)
    })

    it('refuses a player', async () => {
      const { useCase, updateTraining } = setup(userWith([{ role: 'player', teamId: 'team-1' }]), convocationOf('training'))
      await expect(useCase.execute(trainingInput())).rejects.toBeInstanceOf(ForbiddenError)
      expect(updateTraining).not.toHaveBeenCalled()
    })

    it('refuses a coach of ANOTHER team', async () => {
      const { useCase } = setup(userWith([{ role: 'coach', teamIds: ['team-2'] }]), convocationOf('match'))
      await expect(useCase.execute(matchInput())).rejects.toBeInstanceOf(ForbiddenError)
    })

    it('refuses a coach on a meeting: meeting_details:update is admin-only', async () => {
      const { useCase, updateMeeting } = setup(userWith([{ role: 'coach', teamIds: ['team-1'] }]), convocationOf('meeting'))
      await expect(useCase.execute(meetingInput())).rejects.toBeInstanceOf(ForbiddenError)
      expect(updateMeeting).not.toHaveBeenCalled()
    })
  })

  describe('type and window', () => {
    it('refuses a type change', async () => {
      const { useCase, updateMatch } = setup(admin(), convocationOf('training'))
      await expect(useCase.execute(matchInput())).rejects.toBeInstanceOf(InvalidConvocationInputError)
      expect(updateMatch).not.toHaveBeenCalled()
    })

    it('refuses a convocation whose date has passed (checked against the ORIGINAL date)', async () => {
      const { useCase, updateTraining } = setup(admin(), convocationOf('training', { date: '2026-09-30T10:00:00.000Z' }))
      await expect(useCase.execute(trainingInput())).rejects.toBeInstanceOf(ConvocationNotEditableError)
      expect(updateTraining).not.toHaveBeenCalled()
    })

    it('refuses a date exactly equal to now (strict window)', async () => {
      const { useCase } = setup(admin(), convocationOf('training', { date: NOW.toISOString() }))
      await expect(useCase.execute(trainingInput())).rejects.toBeInstanceOf(ConvocationNotEditableError)
    })

    it.each(['closed', 'cancelled'] as const)('refuses a %s convocation', async (status) => {
      const { useCase } = setup(admin(), convocationOf('training', { status }))
      await expect(useCase.execute(trainingInput())).rejects.toBeInstanceOf(ConvocationNotEditableError)
    })

    it('refuses a NEW date in the past', async () => {
      const { useCase, updateTraining } = setup(admin(), convocationOf('training'))
      await expect(useCase.execute(trainingInput({ date: '2026-09-01T10:00:00.000Z' }))).rejects.toBeInstanceOf(
        InvalidConvocationInputError,
      )
      expect(updateTraining).not.toHaveBeenCalled()
    })
  })

  describe('training', () => {
    it('writes date and location id only, through updateTraining', async () => {
      const { useCase, updateTraining } = setup(admin(), convocationOf('training'))
      await useCase.execute(trainingInput())
      expect(updateTraining).toHaveBeenCalledExactlyOnceWith({
        convocationId: 'convocation-1',
        type: 'training',
        date: NEW_FUTURE,
        trainingLocationId: 'location-1',
      })
    })

    it('refuses an empty location id', async () => {
      const { useCase } = setup(admin(), convocationOf('training'))
      await expect(useCase.execute(trainingInput({ trainingLocationId: '' }))).rejects.toBeInstanceOf(
        InvalidTrainingLocationInputError,
      )
    })
  })

  describe('match', () => {
    it('trims the location and writes the narrow match payload', async () => {
      const { useCase, updateMatch } = setup(admin(), convocationOf('match'))
      await useCase.execute(matchInput())
      expect(updateMatch).toHaveBeenCalledExactlyOnceWith({
        convocationId: 'convocation-1',
        type: 'match',
        date: NEW_FUTURE,
        location: 'Stade municipal',
        opponentId: 'opponent-1',
        isHome: false,
        meetingPointTime: null,
        meetingPointLocation: null,
      })
    })

    it('never carries teamId, status or any identity field in the payload', async () => {
      const { useCase, updateMatch } = setup(admin(), convocationOf('match'))
      await useCase.execute(matchInput())
      const payload = updateMatch.mock.calls[0]?.[0] as unknown as Record<string, unknown>
      expect(Object.keys(payload).sort()).toEqual(
        ['convocationId', 'date', 'isHome', 'location', 'meetingPointLocation', 'meetingPointTime', 'opponentId', 'type'].sort(),
      )
    })

    it('refuses an opponent outside the team opponents (AC-WC-19)', async () => {
      const { useCase, updateMatch } = setup(admin(), convocationOf('match'), ['opponent-2'])
      await expect(useCase.execute(matchInput())).rejects.toBeInstanceOf(InvalidConvocationInputError)
      expect(updateMatch).not.toHaveBeenCalled()
    })

    it('refuses an empty location', async () => {
      const { useCase } = setup(admin(), convocationOf('match'))
      await expect(useCase.execute(matchInput({ location: '   ' }))).rejects.toBeInstanceOf(InvalidConvocationInputError)
    })

    it('validates the meeting point against the NEW kickoff (AC-WC-22)', async () => {
      const { useCase, updateMatch } = setup(admin(), convocationOf('match'))
      // Before the OLD kickoff's day but not the same day as the NEW kickoff.
      await expect(useCase.execute(matchInput({ meetingPointTime: FUTURE }))).rejects.toBeInstanceOf(InvalidScheduleError)
      expect(updateMatch).not.toHaveBeenCalled()
    })

    it('accepts a meeting point before the new kickoff, the same day', async () => {
      const { useCase, updateMatch } = setup(admin(), convocationOf('match'))
      await useCase.execute(matchInput({ meetingPointTime: '2026-10-06T13:30:00.000Z', meetingPointLocation: ' Vestiaires ' }))
      expect(updateMatch).toHaveBeenCalledOnce()
      expect(updateMatch.mock.calls[0]?.[0]).toMatchObject({
        meetingPointTime: '2026-10-06T13:30:00.000Z',
        meetingPointLocation: 'Vestiaires',
      })
    })

    it('refuses a meeting point equal to the kickoff', async () => {
      const { useCase } = setup(admin(), convocationOf('match'))
      await expect(useCase.execute(matchInput({ meetingPointTime: NEW_FUTURE }))).rejects.toBeInstanceOf(InvalidScheduleError)
    })
  })

  describe('meeting', () => {
    it('trims title, drops blank agenda points and keeps order', async () => {
      const { useCase, updateMeeting } = setup(admin(), convocationOf('meeting'))
      await useCase.execute(meetingInput())
      expect(updateMeeting).toHaveBeenCalledExactlyOnceWith({
        convocationId: 'convocation-1',
        type: 'meeting',
        date: NEW_FUTURE,
        location: 'Salle',
        title: 'Bilan',
        agenda: ['Point 1', 'Point 2'],
      })
    })

    it('admits an empty agenda', async () => {
      const { useCase, updateMeeting } = setup(admin(), convocationOf('meeting'))
      await useCase.execute(meetingInput({ agenda: [] }))
      expect(updateMeeting.mock.calls[0]?.[0]).toMatchObject({ agenda: [] })
    })

    it('refuses an empty title or location', async () => {
      const { useCase } = setup(admin(), convocationOf('meeting'))
      await expect(useCase.execute(meetingInput({ title: '  ' }))).rejects.toBeInstanceOf(InvalidConvocationInputError)
      await expect(useCase.execute(meetingInput({ location: '' }))).rejects.toBeInstanceOf(InvalidConvocationInputError)
    })
  })

  // AC-WC-20 — atomicity itself is the RPC's (one transaction); at the use
  // case level the contract is that a refusal from the repository surfaces
  // as-is and nothing else is written.
  it('propagates a repository refusal without writing anything else (AC-WC-20)', async () => {
    const { useCase, updateMatch } = setup(admin(), convocationOf('match'))
    updateMatch.mockRejectedValueOnce(new ForbiddenError('satellite refused'))
    await expect(useCase.execute(matchInput())).rejects.toBeInstanceOf(ForbiddenError)
    expect(updateMatch).toHaveBeenCalledOnce()
  })
})
