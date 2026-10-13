import { describe, expect, it, vi } from 'vitest'
import type { Convocation } from '../../entities/convocation'
import type { MatchDetails } from '../../entities/match-details'
import type { User } from '../../entities/user'
import { ConvocationAttendeeAddRefusedError } from '../../errors/convocation-attendee-add-refused-error'
import { ConvocationAttendeeCapExceededError } from '../../errors/convocation-attendee-cap-exceeded-error'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidConvocationInputError } from '../../errors/invalid-convocation-input-error'
import { NotFoundError } from '../../errors/not-found-error'
import type { ConvocationAttendeeRepository } from '../../repositories/convocation-attendee-repository'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { ConvocationRespondersRepository } from '../../repositories/convocation-responders-repository'
import type { MatchDetailsRepository } from '../../repositories/match-details-repository'
import type { TeamRepository } from '../../repositories/team-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { AddConvocationAttendeeUseCase } from './AddConvocationAttendeeUseCase'

const KICKOFF = '2026-11-01T15:00:00.000Z'
const BEFORE = new Date('2026-10-31T10:00:00.000Z')

function aUser(roles: User['roles']): User {
  return { id: 'actor-1', fullName: 'Actor', email: 'a@example.com', roles, position: null, age: null, handedness: null, charterAcceptedAt: null }
}

function aConvocation(overrides: Partial<Convocation> = {}): Convocation {
  return {
    id: 'c1', teamId: 'team-1', type: 'match', date: KICKOFF, location: 'Stade', trainingLocation: null, status: 'open',
    closedAt: null, closedBy: null, cancelledAt: null, cancelledBy: null, cancellationReason: null,
    createdBy: 'actor-1', createdAt: '2026-10-01T00:00:00.000Z', ...overrides,
  }
}

function convoked(count: number) {
  return Array.from({ length: count }, (_, i) => ({ userId: `p${i + 1}`, hasResponded: false, displayName: `P${i + 1}`, position: null }))
}

function setup(options: {
  user?: User | null
  convocation?: Convocation | null
  competitionType?: MatchDetails['competitionType']
  convokedCount?: number
  now?: Date
} = {}) {
  const add = vi.fn(async () => {})
  const user = options.user === undefined ? aUser([{ role: 'coach', teamIds: ['team-1'] }]) : options.user
  const convocation = options.convocation === undefined ? aConvocation() : options.convocation
  const useCase = new AddConvocationAttendeeUseCase(
    { findById: async () => user } as unknown as UserRepository,
    { findById: async () => convocation } as unknown as ConvocationRepository,
    { findById: async () => ({ id: 'team-1', name: 'Team', sectionId: 'section-1', seasonId: 's1' }) } as unknown as TeamRepository,
    {
      findByConvocationId: async () => ({ competitionType: options.competitionType ?? 'official' }) as MatchDetails,
    } as unknown as MatchDetailsRepository,
    { listForConvocation: async () => convoked(options.convokedCount ?? 5), listTeamPlayers: async () => [] } as ConvocationRespondersRepository,
    { add, listConvokedConvocationIds: async () => [] } as ConvocationAttendeeRepository,
    () => options.now ?? BEFORE,
  )
  return { useCase, add }
}

const input = { actorId: 'actor-1', convocationId: 'c1', userId: 'new-player' }

describe('AddConvocationAttendeeUseCase', () => {
  it('adds the player for the coach of the team', async () => {
    const { useCase, add } = setup()
    await useCase.execute(input)
    expect(add).toHaveBeenCalledWith('c1', 'new-player')
  })

  it('refuses an unknown actor', async () => {
    const { useCase, add } = setup({ user: null })
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(ForbiddenError)
    expect(add).not.toHaveBeenCalled()
  })

  it('refuses a coach of another team (AC-02)', async () => {
    const { useCase, add } = setup({ user: aUser([{ role: 'coach', teamIds: ['team-2'] }]) })
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(ForbiddenError)
    expect(add).not.toHaveBeenCalled()
  })

  it('refuses a player token (AC-CPS-11)', async () => {
    const { useCase, add } = setup({ user: aUser([{ role: 'player', teamId: 'team-1' }]) })
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(ForbiddenError)
    expect(add).not.toHaveBeenCalled()
  })

  it('throws NotFoundError for an unknown convocation', async () => {
    const { useCase } = setup({ convocation: null })
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(NotFoundError)
  })

  it('refuses exactly at kickoff and after it (PO-CPS-06)', async () => {
    await expect(setup({ now: new Date(KICKOFF) }).useCase.execute(input)).rejects.toBeInstanceOf(ConvocationAttendeeAddRefusedError)
    await expect(setup({ now: new Date('2026-11-01T16:00:00.000Z') }).useCase.execute(input)).rejects.toBeInstanceOf(
      ConvocationAttendeeAddRefusedError,
    )
  })

  it('refuses a closed or cancelled convocation', async () => {
    await expect(setup({ convocation: aConvocation({ status: 'closed' }) }).useCase.execute(input)).rejects.toBeInstanceOf(
      ConvocationAttendeeAddRefusedError,
    )
    await expect(setup({ convocation: aConvocation({ status: 'cancelled' }) }).useCase.execute(input)).rejects.toBeInstanceOf(
      ConvocationAttendeeAddRefusedError,
    )
  })

  it('refuses a player who is already convoked', async () => {
    const { useCase, add } = setup()
    await expect(useCase.execute({ ...input, userId: 'p2' })).rejects.toBeInstanceOf(InvalidConvocationInputError)
    expect(add).not.toHaveBeenCalled()
  })

  it('accepts the 14th convoked player of an official match and refuses the 15th (AC-CPS-06)', async () => {
    await expect(setup({ convokedCount: 13 }).useCase.execute(input)).resolves.toBeUndefined()
    const full = setup({ convokedCount: 14 })
    await expect(full.useCase.execute(input)).rejects.toBeInstanceOf(ConvocationAttendeeCapExceededError)
    expect(full.add).not.toHaveBeenCalled()
  })

  it('refuses an addition on a backfilled official match already above 14', async () => {
    await expect(setup({ convokedCount: 17 }).useCase.execute(input)).rejects.toBeInstanceOf(ConvocationAttendeeCapExceededError)
  })

  it('does not cap a friendly match, a training or a meeting (AC-CPS-07)', async () => {
    await expect(setup({ competitionType: 'friendly', convokedCount: 20 }).useCase.execute(input)).resolves.toBeUndefined()
    await expect(
      setup({ convocation: aConvocation({ type: 'training' }), convokedCount: 20 }).useCase.execute(input),
    ).resolves.toBeUndefined()
    await expect(
      setup({ convocation: aConvocation({ type: 'meeting' }), convokedCount: 20 }).useCase.execute(input),
    ).resolves.toBeUndefined()
  })
})
