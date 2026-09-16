import { describe, expect, it, vi } from 'vitest'
import type { Vote } from '../../entities/vote'
import type { VoteRepository } from '../../repositories/vote-repository'
import { GetMyVoteUseCase } from './GetMyVoteUseCase'

function fakeVoteRepository(vote: Vote | null): VoteRepository {
  return {
    upsert: async (v) => ({ id: 'vote-1', ...v }),
    findMyVote: vi.fn(async () => vote),
  }
}

describe('GetMyVoteUseCase', () => {
  it("returns the caller's own vote when one exists", async () => {
    const vote: Vote = {
      id: 'vote-1',
      convocationId: 'convocation-1',
      categoryId: 'man_of_the_match',
      voterId: 'player-1',
      candidateId: 'player-2',
      votedAt: '2026-09-16T20:00:00.000Z',
    }
    const useCase = new GetMyVoteUseCase(fakeVoteRepository(vote))

    await expect(
      useCase.execute({ convocationId: 'convocation-1', categoryId: 'man_of_the_match', voterId: 'player-1' }),
    ).resolves.toEqual(vote)
  })

  it('returns null when the caller has not voted in this category yet', async () => {
    const useCase = new GetMyVoteUseCase(fakeVoteRepository(null))

    await expect(
      useCase.execute({ convocationId: 'convocation-1', categoryId: 'man_of_the_match', voterId: 'player-1' }),
    ).resolves.toBeNull()
  })

  it('delegates to the repository with the given convocation, category and voter', async () => {
    const findMyVote = vi.fn(async () => null)
    const useCase = new GetMyVoteUseCase({ upsert: async (v) => ({ id: 'vote-1', ...v }), findMyVote })

    await useCase.execute({ convocationId: 'convocation-1', categoryId: 'man_of_the_match', voterId: 'player-1' })

    expect(findMyVote).toHaveBeenCalledExactlyOnceWith('convocation-1', 'man_of_the_match', 'player-1')
  })
})
