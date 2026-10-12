import { describe, expect, it, vi } from 'vitest'
import type { Convocation } from '../../entities/convocation'
import type { Vote } from '../../entities/vote'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { MatchDetails } from '../../entities/match-details'
import type { MatchDetailsRepository } from '../../repositories/match-details-repository'
import type { OpponentRepository } from '../../repositories/opponent-repository'
import type { VoteRepository } from '../../repositories/vote-repository'
import { GetPendingVoteReminderUseCase } from './GetPendingVoteReminderUseCase'

const NOW = new Date('2026-10-12T12:00:00.000Z')

function convocation(overrides: Partial<Convocation>): Convocation {
  return {
    id: 'c1',
    teamId: 'team-1',
    type: 'match',
    date: '2026-10-11T15:00:00.000Z',
    status: 'open',
    ...overrides,
  } as Convocation
}

function setup(convocations: Convocation[], votedConvocationIds: string[] = [], matchDetails: Partial<MatchDetails> | null = null) {
  const convocationRepository = { listForTeam: vi.fn().mockResolvedValue(convocations) } as unknown as ConvocationRepository
  const voteRepository: VoteRepository = {
    upsert: async (v) => ({ id: 'v', ...v }),
    findMyVote: vi.fn(async (convocationId: string) =>
      votedConvocationIds.includes(convocationId) ? ({ id: 'v' } as Vote) : null),
  }
  const matchDetailsRepository = {
    findByConvocationId: vi.fn().mockResolvedValue(matchDetails && { opponentId: 'o1', goalsFor: null, goalsAgainst: null, ...matchDetails }),
  } as unknown as MatchDetailsRepository
  const opponentRepository = { findById: vi.fn().mockResolvedValue({ id: 'o1', name: 'AS Rivale' }) } as unknown as OpponentRepository
  return new GetPendingVoteReminderUseCase(convocationRepository, voteRepository, matchDetailsRepository, opponentRepository)
}

const input = { teamId: 'team-1', userId: 'u1', categoryId: 'man_of_the_match', now: NOW }

describe('GetPendingVoteReminderUseCase', () => {
  it('returns the unvoted match inside the window with the days left', async () => {
    const result = await setup([convocation({})]).execute(input)
    expect(result).toEqual({
      convocationId: 'c1',
      daysRemaining: 3,
      kickoff: '2026-10-11T15:00:00.000Z',
      opponentName: null,
      goalsFor: null,
      goalsAgainst: null,
    })
  })

  it('carries the opponent and the recorded score for the recap', async () => {
    const result = await setup([convocation({})], [], { goalsFor: 2, goalsAgainst: 1 }).execute(input)
    expect(result).toMatchObject({ opponentName: 'AS Rivale', goalsFor: 2, goalsAgainst: 1 })
  })

  it('returns null once the player has voted', async () => {
    expect(await setup([convocation({})], ['c1']).execute(input)).toBeNull()
  })

  it('ignores non-match, cancelled, future and expired convocations', async () => {
    const result = await setup([
      convocation({ id: 'training', type: 'training' }),
      convocation({ id: 'cancelled', status: 'cancelled' }),
      convocation({ id: 'future', date: '2026-10-13T15:00:00.000Z' }),
      convocation({ id: 'expired', date: '2026-10-01T15:00:00.000Z' }),
    ]).execute(input)
    expect(result).toBeNull()
  })

  it('picks the match closing first and skips the ones already voted', async () => {
    const older = convocation({ id: 'older', date: '2026-10-10T15:00:00.000Z' })
    const newer = convocation({ id: 'newer', date: '2026-10-11T15:00:00.000Z' })
    expect((await setup([newer, older]).execute(input))?.convocationId).toBe('older')
    expect((await setup([newer, older], ['older']).execute(input))?.convocationId).toBe('newer')
  })
})
