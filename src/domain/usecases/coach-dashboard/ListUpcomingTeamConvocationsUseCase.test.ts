import { describe, expect, it, vi } from 'vitest'
import type { Convocation, ConvocationResponse } from '../../entities/convocation'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { ConvocationResponseRepository } from '../../repositories/convocation-response-repository'
import { ListUpcomingTeamConvocationsUseCase } from './ListUpcomingTeamConvocationsUseCase'

function convocationWith(overrides: Partial<Convocation>): Convocation {
  return {
    id: 'c1',
    teamId: 'team-1',
    type: 'training',
    date: '2026-08-20T18:00:00.000Z',
    location: 'Stade municipal',
    status: 'open',
    closedAt: null,
    closedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    ...overrides,
  }
}

function responseWith(overrides: Partial<ConvocationResponse>): ConvocationResponse {
  return {
    id: 'r1',
    convocationId: 'c1',
    userId: 'u1',
    status: 'present',
    reason: null,
    respondedAt: null,
    ...overrides,
  }
}

describe('ListUpcomingTeamConvocationsUseCase', () => {
  const now = new Date('2026-08-19T00:00:00.000Z')

  it('excludes closed and past convocations, keeping only open ones in the future', async () => {
    const upcoming = convocationWith({ id: 'c-upcoming', date: '2026-08-20T18:00:00.000Z', status: 'open' })
    const past = convocationWith({ id: 'c-past', date: '2026-08-01T18:00:00.000Z', status: 'open' })
    const closed = convocationWith({ id: 'c-closed', date: '2026-08-25T18:00:00.000Z', status: 'closed' })
    const listForTeam = vi.fn().mockResolvedValue([upcoming, past, closed])
    const findByConvocation = vi.fn().mockResolvedValue([])
    const convocationRepository = { listForTeam } as unknown as ConvocationRepository
    const convocationResponseRepository = { findByConvocation } as unknown as ConvocationResponseRepository

    const result = await new ListUpcomingTeamConvocationsUseCase(
      convocationRepository,
      convocationResponseRepository,
    ).execute({ teamId: 'team-1', now })

    expect(result.map((r) => r.convocation.id)).toEqual(['c-upcoming'])
    expect(findByConvocation).toHaveBeenCalledWith('c-upcoming')
    expect(findByConvocation).not.toHaveBeenCalledWith('c-past')
    expect(findByConvocation).not.toHaveBeenCalledWith('c-closed')
  })

  it('scopes response counts to each convocation independently (AC-CD-04)', async () => {
    const trainingConvocation = convocationWith({ id: 'c-training', date: '2026-08-20T18:00:00.000Z' })
    const meetingConvocation = convocationWith({ id: 'c-meeting', date: '2026-08-21T18:00:00.000Z' })
    const listForTeam = vi.fn().mockResolvedValue([trainingConvocation, meetingConvocation])
    const findByConvocation = vi.fn().mockImplementation((convocationId: string) => {
      if (convocationId === 'c-training') {
        return Promise.resolve([
          responseWith({ id: 'r1', convocationId, status: 'present' }),
          responseWith({ id: 'r2', convocationId, status: 'absent' }),
        ])
      }
      return Promise.resolve([responseWith({ id: 'r3', convocationId, status: 'pending' })])
    })
    const convocationRepository = { listForTeam } as unknown as ConvocationRepository
    const convocationResponseRepository = { findByConvocation } as unknown as ConvocationResponseRepository

    const result = await new ListUpcomingTeamConvocationsUseCase(
      convocationRepository,
      convocationResponseRepository,
    ).execute({ teamId: 'team-1', now })

    expect(result).toEqual([
      { convocation: trainingConvocation, responseCounts: { present: 1, absent: 1, pending: 0 } },
      { convocation: meetingConvocation, responseCounts: { present: 0, absent: 0, pending: 1 } },
    ])
  })

  it('returns an empty list when the team has no upcoming convocation', async () => {
    const listForTeam = vi.fn().mockResolvedValue([])
    const findByConvocation = vi.fn()
    const convocationRepository = { listForTeam } as unknown as ConvocationRepository
    const convocationResponseRepository = { findByConvocation } as unknown as ConvocationResponseRepository

    const result = await new ListUpcomingTeamConvocationsUseCase(
      convocationRepository,
      convocationResponseRepository,
    ).execute({ teamId: 'team-1', now })

    expect(result).toEqual([])
    expect(findByConvocation).not.toHaveBeenCalled()
  })
})
