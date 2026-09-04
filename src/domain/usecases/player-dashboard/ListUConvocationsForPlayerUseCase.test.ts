import { describe, expect, it, vi } from 'vitest'
import type { Convocation, ConvocationResponse } from '@/domain/entities/convocation'
import type { ConvocationRepository } from '@/domain/repositories/convocation-repository'
import type { ConvocationResponseRepository } from '@/domain/repositories/convocation-response-repository'
import type { AssembleConvocationDetailFieldsUseCase, ConvocationDetailFields } from '@/domain/usecases/convocation/AssembleConvocationDetailFieldsUseCase'
import type { GetConvocationDetailsUseCase } from '@/domain/usecases/convocation/GetConvocationDetailsUseCase'
import { ListUpcomingConvocationsForPlayerUseCase } from './ListUConvocationsForPlayerUseCase'

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
    createdBy: 'coach-1',
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

const noDetailFields: ConvocationDetailFields = { matchDetails: null, opponent: null, meetingDetails: null }

// Type-conditional detail assembly is AssembleConvocationDetailFieldsUseCase's
// own responsibility (and its own test file) — these stand in as no-op
// collaborators for tests that are about the includePast filter, not detail
// resolution, same split as ListTeamConvocationsUseCase.test.ts's
// noopMatchDetailsRepository/noopOpponentRepository.
function noopGetConvocationDetailsUseCase(): GetConvocationDetailsUseCase {
  return { execute: vi.fn().mockResolvedValue(null) } as unknown as GetConvocationDetailsUseCase
}

function noopAssembleConvocationDetailFieldsUseCase(): AssembleConvocationDetailFieldsUseCase {
  return { execute: vi.fn().mockResolvedValue(noDetailFields) } as unknown as AssembleConvocationDetailFieldsUseCase
}

describe('ListUpcomingConvocationsForPlayerUseCase', () => {
  const now = new Date('2026-08-19T00:00:00.000Z')

  it('by default (includePast omitted), excludes closed and past convocations, keeping only open ones in the future', async () => {
    const upcoming = convocationWith({ id: 'c-upcoming', date: '2026-08-20T18:00:00.000Z', status: 'open' })
    const past = convocationWith({ id: 'c-past', date: '2026-08-01T18:00:00.000Z', status: 'open' })
    const closed = convocationWith({ id: 'c-closed', date: '2026-08-25T18:00:00.000Z', status: 'closed' })
    const listForTeam = vi.fn().mockResolvedValue([upcoming, past, closed])
    const findByConvocationAndUser = vi.fn().mockResolvedValue(null)
    const convocationRepository = { listForTeam } as unknown as ConvocationRepository
    const convocationResponseRepository = { findByConvocationAndUser } as unknown as ConvocationResponseRepository

    const result = await new ListUpcomingConvocationsForPlayerUseCase(
      convocationRepository,
      convocationResponseRepository,
      noopAssembleConvocationDetailFieldsUseCase(),
      noopGetConvocationDetailsUseCase(),
    ).execute({ teamId: 'team-1', userId: 'u1', now })

    expect(result.map((r) => r.convocation.id)).toEqual(['c-upcoming'])
    expect(findByConvocationAndUser).toHaveBeenCalledWith('c-upcoming', 'u1')
    expect(findByConvocationAndUser).not.toHaveBeenCalledWith('c-past', 'u1')
    expect(findByConvocationAndUser).not.toHaveBeenCalledWith('c-closed', 'u1')
  })

  it('includePast: true keeps past AND closed convocations too (specs/calendar.md PO-CA-02), still soonest-first', async () => {
    const upcoming = convocationWith({ id: 'c-upcoming', date: '2026-08-25T18:00:00.000Z', status: 'open' })
    const past = convocationWith({ id: 'c-past', date: '2026-08-01T18:00:00.000Z', status: 'open' })
    const closed = convocationWith({ id: 'c-closed', date: '2026-08-10T18:00:00.000Z', status: 'closed' })
    // Order deliberately scrambled on input — byDateAscending is what
    // should produce the sorted output, not incidental listForTeam order.
    const listForTeam = vi.fn().mockResolvedValue([upcoming, closed, past])
    const findByConvocationAndUser = vi.fn().mockResolvedValue(null)
    const convocationRepository = { listForTeam } as unknown as ConvocationRepository
    const convocationResponseRepository = { findByConvocationAndUser } as unknown as ConvocationResponseRepository

    const result = await new ListUpcomingConvocationsForPlayerUseCase(
      convocationRepository,
      convocationResponseRepository,
      noopAssembleConvocationDetailFieldsUseCase(),
      noopGetConvocationDetailsUseCase(),
    ).execute({ teamId: 'team-1', userId: 'u1', now, includePast: true })

    // Same as ListTeamConvocationsUseCase: includePast bypasses isUpcoming
    // entirely, doesn't filter on `status` either — AC-CA-16's StatusBadge
    // is what surfaces closed/cancelled on the row, not this use case.
    expect(result.map((r) => r.convocation.id)).toEqual(['c-past', 'c-closed', 'c-upcoming'])
  })

  it('carries the player\'s OWN response, never an aggregate (PO-PD-05, AC-PD-09)', async () => {
    const convocation = convocationWith({ id: 'c1' })
    const myResponse = responseWith({ id: 'r1', convocationId: 'c1', userId: 'u1', status: 'absent' })
    const listForTeam = vi.fn().mockResolvedValue([convocation])
    const findByConvocationAndUser = vi.fn().mockResolvedValue(myResponse)
    const convocationRepository = { listForTeam } as unknown as ConvocationRepository
    const convocationResponseRepository = { findByConvocationAndUser } as unknown as ConvocationResponseRepository

    const result = await new ListUpcomingConvocationsForPlayerUseCase(
      convocationRepository,
      convocationResponseRepository,
      noopAssembleConvocationDetailFieldsUseCase(),
      noopGetConvocationDetailsUseCase(),
    ).execute({ teamId: 'team-1', userId: 'u1', now })

    expect(findByConvocationAndUser).toHaveBeenCalledWith('c1', 'u1')
    expect(result).toEqual([{ convocation, myResponse, ...noDetailFields }])
  })

  it('returns null myResponse when the player has not responded yet (distinct from a "pending" status row)', async () => {
    const convocation = convocationWith({ id: 'c1' })
    const listForTeam = vi.fn().mockResolvedValue([convocation])
    const findByConvocationAndUser = vi.fn().mockResolvedValue(null)
    const convocationRepository = { listForTeam } as unknown as ConvocationRepository
    const convocationResponseRepository = { findByConvocationAndUser } as unknown as ConvocationResponseRepository

    const result = await new ListUpcomingConvocationsForPlayerUseCase(
      convocationRepository,
      convocationResponseRepository,
      noopAssembleConvocationDetailFieldsUseCase(),
      noopGetConvocationDetailsUseCase(),
    ).execute({ teamId: 'team-1', userId: 'u1', now })

    expect(result).toEqual([{ convocation, myResponse: null, ...noDetailFields }])
  })

  it('skips GetConvocationDetailsUseCase for a training convocation (existing type === "training" guard)', async () => {
    const training = convocationWith({ id: 'c-training', type: 'training' })
    const listForTeam = vi.fn().mockResolvedValue([training])
    const findByConvocationAndUser = vi.fn().mockResolvedValue(null)
    const convocationRepository = { listForTeam } as unknown as ConvocationRepository
    const convocationResponseRepository = { findByConvocationAndUser } as unknown as ConvocationResponseRepository
    const getConvocationDetailsUseCase = noopGetConvocationDetailsUseCase()
    const assembleConvocationDetailFieldsUseCase = noopAssembleConvocationDetailFieldsUseCase()

    await new ListUpcomingConvocationsForPlayerUseCase(
      convocationRepository,
      convocationResponseRepository,
      assembleConvocationDetailFieldsUseCase,
      getConvocationDetailsUseCase,
    ).execute({ teamId: 'team-1', userId: 'u1', now })

    expect(getConvocationDetailsUseCase.execute).not.toHaveBeenCalled()
    expect(assembleConvocationDetailFieldsUseCase.execute).toHaveBeenCalledWith(training, null)
  })

  it('returns an empty list when the team has no convocation in scope', async () => {
    const listForTeam = vi.fn().mockResolvedValue([])
    const findByConvocationAndUser = vi.fn()
    const convocationRepository = { listForTeam } as unknown as ConvocationRepository
    const convocationResponseRepository = { findByConvocationAndUser } as unknown as ConvocationResponseRepository

    const result = await new ListUpcomingConvocationsForPlayerUseCase(
      convocationRepository,
      convocationResponseRepository,
      noopAssembleConvocationDetailFieldsUseCase(),
      noopGetConvocationDetailsUseCase(),
    ).execute({ teamId: 'team-1', userId: 'u1', now })

    expect(result).toEqual([])
    expect(findByConvocationAndUser).not.toHaveBeenCalled()
  })
})
