import { describe, expect, it, vi } from 'vitest'
import type { AttendanceRecord, Convocation } from '../../entities/convocation'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { NotFoundError } from '../../errors/not-found-error'
import type { AttendanceRecordRepository } from '../../repositories/attendance-record-repository'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { ConfirmAttendanceUseCase } from './ConfirmAttendanceUseCase'

const NOW = new Date('2026-08-10T20:00:00.000Z')

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

function convocationWith(overrides: Partial<Convocation> = {}): Convocation {
  return {
    id: 'convocation-1',
    teamId: 'team-1',
    type: 'training',
    date: '2026-08-10T18:00:00.000Z',
    location: 'Gymnase',
    status: 'open',
    closedAt: null,
    closedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    createdBy: 'coach-1',
    ...overrides,
  }
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
    updateFullName: async () => {},
    invite: async () => ({ url: 'https://app.example.com/activation?token_hash=fake&type=invite' }),
    reissueInvitationLink: async () => ({ url: 'https://app.example.com/activation?token_hash=fake&type=magiclink' }),
  }
}

function fakeConvocationRepository(convocation: Convocation | null): ConvocationRepository {
  return {
    listForTeam: async () => [],
    findById: async () => convocation,
    createTraining: async () => convocation as Convocation,
    createMatch: async () => convocation as Convocation,
    createMeeting: async () => convocation as Convocation,
  }
}

function fakeAttendanceRecordRepository(
  overrides: Partial<AttendanceRecordRepository> = {},
): AttendanceRecordRepository {
  return {
    upsert: async (record) => ({ id: 'attendance-1', ...record }),
    findByConvocation: async () => [],
    ...overrides,
  }
}

describe('ConfirmAttendanceUseCase', () => {
  it('throws NotFoundError when the confirming user does not exist', async () => {
    const useCase = new ConfirmAttendanceUseCase(
      fakeUserRepository(null),
      fakeConvocationRepository(convocationWith()),
      fakeAttendanceRecordRepository(),
    )

    await expect(
      useCase.execute({ convocationId: 'convocation-1', userId: 'player-1', actualStatus: 'present', validatedBy: 'coach-1', now: NOW }),
    ).rejects.toThrow(NotFoundError)
  })

  it('throws NotFoundError when the convocation does not exist', async () => {
    const useCase = new ConfirmAttendanceUseCase(
      fakeUserRepository(coachUser(['team-1'])),
      fakeConvocationRepository(null),
      fakeAttendanceRecordRepository(),
    )

    await expect(
      useCase.execute({ convocationId: 'convocation-1', userId: 'player-1', actualStatus: 'present', validatedBy: 'coach-1', now: NOW }),
    ).rejects.toThrow(NotFoundError)
  })

  // AC-02, spec §2 "Application technique" — a coach of another team must be
  // refused, the exact gap the can.ts team-scope fix closes for this action.
  it('throws ForbiddenError when the coach is not assigned to the convocation team', async () => {
    const useCase = new ConfirmAttendanceUseCase(
      fakeUserRepository(coachUser(['other-team'])),
      fakeConvocationRepository(convocationWith({ teamId: 'team-1' })),
      fakeAttendanceRecordRepository(),
    )

    await expect(
      useCase.execute({ convocationId: 'convocation-1', userId: 'player-1', actualStatus: 'present', validatedBy: 'coach-1', now: NOW }),
    ).rejects.toThrow(ForbiddenError)
  })

  // AC-AT-02, the founding use case: a player declared present but marked
  // absent by the coach produces an AttendanceRecord independent of that
  // declared ConvocationResponse — this use case never touches the latter.
  it('upserts the actual status with absenceValidity/note forced to null (AC-AT-08) and validatedBy set to the caller (AC-AT-04)', async () => {
    const upsert = vi.fn(async (record: Omit<AttendanceRecord, 'id'>) => ({ id: 'attendance-1', ...record }))
    const useCase = new ConfirmAttendanceUseCase(
      fakeUserRepository(coachUser(['team-1'])),
      fakeConvocationRepository(convocationWith()),
      fakeAttendanceRecordRepository({ upsert }),
    )

    const result = await useCase.execute({
      convocationId: 'convocation-1',
      userId: 'player-1',
      actualStatus: 'absent',
      validatedBy: 'coach-1',
      now: NOW,
    })

    expect(upsert).toHaveBeenCalledExactlyOnceWith({
      convocationId: 'convocation-1',
      userId: 'player-1',
      actualStatus: 'absent',
      absenceValidity: null,
      note: null,
      validatedBy: 'coach-1',
      validatedAt: NOW.toISOString(),
    })
    expect(result.actualStatus).toBe('absent')
  })
})
