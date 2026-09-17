import { describe, expect, it, vi } from 'vitest'
import type { Convocation } from '../../entities/convocation'
import type { User } from '../../entities/user'
import type { Vote } from '../../entities/vote'
import { ForbiddenError } from '../../errors/forbidden-error'
import { NotFoundError } from '../../errors/not-found-error'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { UserRepository } from '../../repositories/user-repository'
import type { VoteRepository } from '../../repositories/vote-repository'
import { CastVoteUseCase } from './CastVoteUseCase'

const NOW = new Date('2026-09-16T20:00:00.000Z')

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
    type: 'match',
    date: '2026-09-14T18:00:00.000Z',
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

function fakeVoteRepository(overrides: Partial<VoteRepository> = {}): VoteRepository {
  return {
    upsert: async (vote) => ({ id: 'vote-1', ...vote }),
    findMyVote: async () => null,
    ...overrides,
  }
}

describe('CastVoteUseCase', () => {
  it('throws NotFoundError when the voter does not exist', async () => {
    const useCase = new CastVoteUseCase(fakeUserRepository(null), fakeConvocationRepository(convocationWith()), fakeVoteRepository())

    await expect(
      useCase.execute({ convocationId: 'convocation-1', categoryId: 'positive', voterId: 'player-1', candidateId: 'player-2', now: NOW }),
    ).rejects.toThrow(NotFoundError)
  })

  it('throws NotFoundError when the convocation does not exist', async () => {
    const useCase = new CastVoteUseCase(fakeUserRepository(playerUser('team-1')), fakeConvocationRepository(null), fakeVoteRepository())

    await expect(
      useCase.execute({ convocationId: 'convocation-1', categoryId: 'positive', voterId: 'player-1', candidateId: 'player-2', now: NOW }),
    ).rejects.toThrow(NotFoundError)
  })

  // AC-02, same class of gap the can.ts team-scope fix closes for
  // 'vote:cast' — a player of another team must be refused.
  it('throws ForbiddenError when the player is not a member of the convocation team', async () => {
    const useCase = new CastVoteUseCase(
      fakeUserRepository(playerUser('other-team')),
      fakeConvocationRepository(convocationWith({ teamId: 'team-1' })),
      fakeVoteRepository(),
    )

    await expect(
      useCase.execute({ convocationId: 'convocation-1', categoryId: 'positive', voterId: 'player-1', candidateId: 'player-2', now: NOW }),
    ).rejects.toThrow(ForbiddenError)
  })

  // PO-PV-10b, resolved 2026-09-16: self-voting is not permitted.
  it('throws ForbiddenError when the candidate is the voter themselves', async () => {
    const useCase = new CastVoteUseCase(
      fakeUserRepository(playerUser('team-1')),
      fakeConvocationRepository(convocationWith()),
      fakeVoteRepository(),
    )

    await expect(
      useCase.execute({ convocationId: 'convocation-1', categoryId: 'positive', voterId: 'player-1', candidateId: 'player-1', now: NOW }),
    ).rejects.toThrow(ForbiddenError)
  })

  it('upserts the vote for the caller (AC-PV-04/AC-PV-06)', async () => {
    const upsert = vi.fn(async (vote: Omit<Vote, 'id'>) => ({ id: 'vote-1', ...vote }))
    const useCase = new CastVoteUseCase(
      fakeUserRepository(playerUser('team-1')),
      fakeConvocationRepository(convocationWith()),
      fakeVoteRepository({ upsert }),
    )

    const result = await useCase.execute({
      convocationId: 'convocation-1',
      categoryId: 'positive',
      voterId: 'player-1',
      candidateId: 'player-2',
      now: NOW,
    })

    expect(upsert).toHaveBeenCalledExactlyOnceWith({
      convocationId: 'convocation-1',
      categoryId: 'positive',
      voterId: 'player-1',
      candidateId: 'player-2',
      votedAt: NOW.toISOString(),
    })
    expect(result.candidateId).toBe('player-2')
  })
})
