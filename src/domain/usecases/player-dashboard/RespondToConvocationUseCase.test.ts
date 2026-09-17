import { describe, expect, it, vi } from 'vitest'
import type { Convocation, ConvocationResponse } from '../../entities/convocation'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { NotFoundError } from '../../errors/not-found-error'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { ConvocationResponseRepository } from '../../repositories/convocation-response-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { RespondToConvocationUseCase } from './RespondToConvocationUseCase'

const NOW = new Date('2026-08-10T17:00:00.000Z')

function playerUser(teamId: string): User {
  return {
    id: 'player-1',
    fullName: 'Player',
    email: 'player@example.com',
    roles: [{ role: 'player', teamId }],
    position: null,
    charterAcceptedAt: new Date('2026-01-01T00:00:00.000Z'),
  }
}

function convocationWith(overrides: Partial<Convocation> = {}): Convocation {
  return {
    id: 'convocation-1',
    teamId: 'team-1',
    type: 'training',
    date: '2026-08-10T18:00:00.000Z', // 10-min deadline for training → 17:50
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

function fakeConvocationResponseRepository(
  overrides: Partial<ConvocationResponseRepository> = {},
): ConvocationResponseRepository {
  return {
    upsert: async (response) => ({ id: 'response-1', ...response }),
    findByConvocationAndUser: async () => null,
    findByConvocation: async () => [],
    ...overrides,
  }
}

describe('RespondToConvocationUseCase', () => {
  it('throws NotFoundError when the user does not exist', async () => {
    const useCase = new RespondToConvocationUseCase(
      fakeUserRepository(null),
      fakeConvocationRepository(convocationWith()),
      fakeConvocationResponseRepository(),
    )

    await expect(
      useCase.execute({ convocationId: 'convocation-1', userId: 'player-1', status: 'present', now: NOW }),
    ).rejects.toThrow(NotFoundError)
  })

  it('throws NotFoundError when the convocation does not exist', async () => {
    const useCase = new RespondToConvocationUseCase(
      fakeUserRepository(playerUser('team-1')),
      fakeConvocationRepository(null),
      fakeConvocationResponseRepository(),
    )

    await expect(
      useCase.execute({ convocationId: 'convocation-1', userId: 'player-1', status: 'present', now: NOW }),
    ).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError when the player is not assigned to the convocation team', async () => {
    const useCase = new RespondToConvocationUseCase(
      fakeUserRepository(playerUser('other-team')),
      fakeConvocationRepository(convocationWith({ teamId: 'team-1' })),
      fakeConvocationResponseRepository(),
    )

    await expect(
      useCase.execute({ convocationId: 'convocation-1', userId: 'player-1', status: 'present', now: NOW }),
    ).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError once the response deadline has passed', async () => {
    const useCase = new RespondToConvocationUseCase(
      fakeUserRepository(playerUser('team-1')),
      fakeConvocationRepository(convocationWith({ date: '2026-08-10T18:00:00.000Z' })),
      fakeConvocationResponseRepository(),
    )

    // Training deadline is 10 min before kickoff (17:50) — 17:51 is past it.
    const now = new Date('2026-08-10T17:51:00.000Z')
    await expect(
      useCase.execute({ convocationId: 'convocation-1', userId: 'player-1', status: 'present', now }),
    ).rejects.toThrow(ForbiddenError)
  })

  // Regression test for the inverted status check in canPlayerRespond:
  // a closed/cancelled convocation must never accept a response, even
  // before what would otherwise be the time-based deadline (AC-PD-06).
  it('throws ForbiddenError when the convocation is no longer open', async () => {
    const useCase = new RespondToConvocationUseCase(
      fakeUserRepository(playerUser('team-1')),
      fakeConvocationRepository(convocationWith({ status: 'closed' })),
      fakeConvocationResponseRepository(),
    )

    await expect(
      useCase.execute({ convocationId: 'convocation-1', userId: 'player-1', status: 'present', now: NOW }),
    ).rejects.toThrow(ForbiddenError)
  })

  it('upserts the response with reason forced to null, regardless of status', async () => {
    const upsert = vi.fn(async (response: Omit<ConvocationResponse, 'id'>) => ({ id: 'response-1', ...response }))
    const useCase = new RespondToConvocationUseCase(
      fakeUserRepository(playerUser('team-1')),
      fakeConvocationRepository(convocationWith()),
      fakeConvocationResponseRepository({ upsert }),
    )

    const result = await useCase.execute({
      convocationId: 'convocation-1',
      userId: 'player-1',
      status: 'absent',
      now: NOW,
    })

    expect(upsert).toHaveBeenCalledExactlyOnceWith({
      convocationId: 'convocation-1',
      userId: 'player-1',
      status: 'absent',
      reason: null,
      respondedAt: NOW.toISOString(),
    })
    expect(result.status).toBe('absent')
  })
})
