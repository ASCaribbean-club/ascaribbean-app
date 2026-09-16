import { describe, expect, it, vi } from 'vitest'
import type { VoteTally } from '../../entities/vote'
import type { VoteTallyRepository } from '../../repositories/vote-tally-repository'
import { GetVoteTallyUseCase } from './GetVoteTallyUseCase'

function fakeVoteTallyRepository(tally: VoteTally): VoteTallyRepository {
  return {
    getTally: vi.fn(async () => tally),
  }
}

describe('GetVoteTallyUseCase', () => {
  it('returns the aggregate tally for the given convocation and category', async () => {
    const tally: VoteTally = {
      convocationId: 'convocation-1',
      categoryId: 'man_of_the_match',
      candidates: [{ candidateId: 'player-2', candidateDisplayName: 'Player 2', voteCount: 6 }],
      totalEligibleVoters: 14,
    }
    const useCase = new GetVoteTallyUseCase(fakeVoteTallyRepository(tally))

    await expect(useCase.execute({ convocationId: 'convocation-1', categoryId: 'man_of_the_match' })).resolves.toEqual(tally)
  })

  it('returns an empty candidates list when no vote has been cast, never a zero-filled ranking (AC-PV-13)', async () => {
    const tally: VoteTally = {
      convocationId: 'convocation-1',
      categoryId: 'man_of_the_match',
      candidates: [],
      totalEligibleVoters: 14,
    }
    const useCase = new GetVoteTallyUseCase(fakeVoteTallyRepository(tally))

    await expect(useCase.execute({ convocationId: 'convocation-1', categoryId: 'man_of_the_match' })).resolves.toEqual(tally)
  })

  it('delegates to the repository with the given convocation and category', async () => {
    const getTally = vi.fn(async () => ({
      convocationId: 'convocation-1',
      categoryId: 'man_of_the_match',
      candidates: [],
      totalEligibleVoters: 0,
    }))
    const useCase = new GetVoteTallyUseCase({ getTally })

    await useCase.execute({ convocationId: 'convocation-1', categoryId: 'man_of_the_match' })

    expect(getTally).toHaveBeenCalledExactlyOnceWith('convocation-1', 'man_of_the_match')
  })
})
