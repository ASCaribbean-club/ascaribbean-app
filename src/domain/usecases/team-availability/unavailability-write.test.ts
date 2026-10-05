import { describe, expect, it, vi } from 'vitest'
import type { NewUnavailability, Unavailability } from '@domain/entities/unavailability'
import type { User } from '@domain/entities/user'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { InvalidUnavailabilityInputError } from '@domain/errors/invalid-unavailability-input-error'
import type { UnavailabilityRepository } from '@domain/repositories/unavailability-repository'
import { DeclareUnavailabilityUseCase } from './DeclareUnavailabilityUseCase'
import { GetActiveUnavailabilitiesUseCase } from './GetActiveUnavailabilitiesUseCase'
import { LiftUnavailabilityUseCase } from './LiftUnavailabilityUseCase'
import { UpdateUnavailabilityUseCase } from './UpdateUnavailabilityUseCase'

const NOW = new Date(2026, 9, 5, 12, 0, 0) // local 2026-10-05

function userWith(roles: User['roles'], id = 'actor-1'): User {
  return { id, fullName: 'Role Holder', email: 'a@b.c', roles, position: null, age: null, handedness: null, charterAcceptedAt: null }
}
const coach = userWith([{ role: 'coach', teamIds: ['team-1'] }])
const officer = userWith([{ role: 'authorized-officer' }])
const player = userWith([{ role: 'player', teamId: 'team-1' }])

const medical: Unavailability = { id: 'm-1', userId: 'p-1', kind: 'medical', startsOn: '2026-09-20', expectedReturnOn: null, declaredBy: 'c', declaredAt: '2026-09-20T08:00:00.000Z' }
const suspension: Unavailability = { id: 's-1', userId: 'p-1', kind: 'suspension', startsOn: '2026-09-25', matchCount: 2, reason: 'Carton rouge', liftedOn: null, declaredBy: 'c', declaredAt: '2026-09-25T08:00:00.000Z' }

function repo(existing: Unavailability[] = []) {
  const create = vi.fn(async (input: NewUnavailability) => ({ id: 'new', ...input }) as Unavailability)
  const update = vi.fn(async (u: Unavailability) => u)
  const repository = { create, update, findByUser: async () => existing, findByTeam: async () => existing } as UnavailabilityRepository
  return { repository, create, update }
}

describe('DeclareUnavailabilityUseCase', () => {
  it('lets a coach of the team declare a medical unavailability', async () => {
    const { repository, create } = repo()
    await new DeclareUnavailabilityUseCase(repository).execute({
      user: coach, teamId: 'team-1', playerId: 'p-1', now: NOW,
      draft: { kind: 'medical', startsOn: '2026-10-05', expectedReturnOn: null },
    })
    expect(create).toHaveBeenCalledWith({
      kind: 'medical', userId: 'p-1', startsOn: '2026-10-05', expectedReturnOn: null,
      declaredBy: 'actor-1', declaredAt: NOW.toISOString(),
    })
  })

  it('lets an officer declare a suspension for any team, trimming the reason', async () => {
    const { repository, create } = repo()
    await new DeclareUnavailabilityUseCase(repository).execute({
      user: officer, teamId: 'team-9', playerId: 'p-1', now: NOW,
      draft: { kind: 'suspension', startsOn: '2026-10-05', matchCount: 3, reason: '  Carton rouge ', liftedOn: null },
    })
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ kind: 'suspension', matchCount: 3, reason: 'Carton rouge' }))
  })

  it('stores a blank reason as null', async () => {
    const { repository, create } = repo()
    await new DeclareUnavailabilityUseCase(repository).execute({
      user: officer, teamId: 'team-9', playerId: 'p-1', now: NOW,
      draft: { kind: 'suspension', startsOn: '2026-10-05', matchCount: 1, reason: '   ', liftedOn: null },
    })
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ reason: null }))
  })

  it('refuses an officer a medical unavailability', async () => {
    const { repository, create } = repo()
    await expect(
      new DeclareUnavailabilityUseCase(repository).execute({
        user: officer, teamId: 'team-1', playerId: 'p-1', now: NOW,
        draft: { kind: 'medical', startsOn: '2026-10-05', expectedReturnOn: null },
      }),
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(create).not.toHaveBeenCalled()
  })

  it.each([
    ['a coach of another team', coach, 'team-2'],
    ['a player', player, 'team-1'],
  ])('refuses %s', async (_label, user, teamId) => {
    const { repository, create } = repo()
    await expect(
      new DeclareUnavailabilityUseCase(repository).execute({
        user, teamId, playerId: 'p-1', now: NOW,
        draft: { kind: 'suspension', startsOn: '2026-10-05', matchCount: 1, reason: null, liftedOn: null },
      }),
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(create).not.toHaveBeenCalled()
  })

  it.each([
    { kind: 'medical', startsOn: '05/10/2026', expectedReturnOn: null },
    { kind: 'medical', startsOn: '2026-02-31', expectedReturnOn: null },
    { kind: 'medical', startsOn: '2026-10-05', expectedReturnOn: 'soon' },
    { kind: 'suspension', startsOn: '2026-10-05', matchCount: -1, reason: null, liftedOn: null },
    { kind: 'suspension', startsOn: '2026-10-05', matchCount: 1.5, reason: null, liftedOn: null },
  ] as const)('rejects invalid input %j', async (draft) => {
    const { repository, create } = repo()
    await expect(
      new DeclareUnavailabilityUseCase(repository).execute({ user: coach, teamId: 'team-1', playerId: 'p-1', now: NOW, draft }),
    ).rejects.toBeInstanceOf(InvalidUnavailabilityInputError)
    expect(create).not.toHaveBeenCalled()
  })

  it('does not check end > start (PO-PU-08 is open)', async () => {
    const { repository, create } = repo()
    await new DeclareUnavailabilityUseCase(repository).execute({
      user: coach, teamId: 'team-1', playerId: 'p-1', now: NOW,
      draft: { kind: 'medical', startsOn: '2026-10-05', expectedReturnOn: '2026-10-01' },
    })
    expect(create).toHaveBeenCalled()
  })
})

describe('UpdateUnavailabilityUseCase', () => {
  it('keeps identity and provenance while changing the editable fields', async () => {
    const { repository, update } = repo()
    await new UpdateUnavailabilityUseCase(repository).execute({
      user: officer, teamId: 'team-9', existing: suspension,
      draft: { kind: 'suspension', startsOn: '2026-09-25', matchCount: 4, reason: null, liftedOn: '2026-11-01' },
    })
    expect(update).toHaveBeenCalledWith({ ...suspension, matchCount: 4, reason: null, liftedOn: '2026-11-01' })
  })

  it('refuses to change the kind', async () => {
    const { repository, update } = repo()
    await expect(
      new UpdateUnavailabilityUseCase(repository).execute({
        user: coach, teamId: 'team-1', existing: medical,
        draft: { kind: 'suspension', startsOn: '2026-09-20', matchCount: 1, reason: null, liftedOn: null },
      }),
    ).rejects.toBeInstanceOf(InvalidUnavailabilityInputError)
    expect(update).not.toHaveBeenCalled()
  })

  it('refuses an officer editing a medical record', async () => {
    const { repository, update } = repo()
    await expect(
      new UpdateUnavailabilityUseCase(repository).execute({
        user: officer, teamId: 'team-1', existing: medical,
        draft: { kind: 'medical', startsOn: '2026-09-20', expectedReturnOn: '2026-10-30' },
      }),
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(update).not.toHaveBeenCalled()
  })
})

describe('LiftUnavailabilityUseCase', () => {
  it('ends a medical unavailability today (expectedReturnOn)', async () => {
    const { repository, update } = repo()
    await new LiftUnavailabilityUseCase(repository).execute({ user: coach, teamId: 'team-1', existing: medical, now: NOW })
    expect(update).toHaveBeenCalledWith({ ...medical, expectedReturnOn: '2026-10-05' })
  })

  it('lifts a suspension today (liftedOn), also for an officer', async () => {
    const { repository, update } = repo()
    await new LiftUnavailabilityUseCase(repository).execute({ user: officer, teamId: 'team-9', existing: suspension, now: NOW })
    expect(update).toHaveBeenCalledWith({ ...suspension, liftedOn: '2026-10-05' })
  })

  it('refuses an officer lifting a medical record', async () => {
    const { repository, update } = repo()
    await expect(
      new LiftUnavailabilityUseCase(repository).execute({ user: officer, teamId: 'team-1', existing: medical, now: NOW }),
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(update).not.toHaveBeenCalled()
  })
})

describe('GetActiveUnavailabilitiesUseCase', () => {
  const past: Unavailability = { ...suspension, id: 's-0', liftedOn: '2026-10-01' }

  it('returns only active records for a coach', async () => {
    const { repository } = repo([medical, suspension, past])
    const result = await new GetActiveUnavailabilitiesUseCase(repository).execute({ user: coach, teamId: 'team-1', playerId: 'p-1', now: NOW })
    expect(result.map((u) => u.id)).toEqual(['m-1', 's-1'])
  })

  it('never returns a medical record to an officer', async () => {
    const { repository } = repo([medical, suspension])
    const result = await new GetActiveUnavailabilitiesUseCase(repository).execute({ user: officer, teamId: 'team-9', playerId: 'p-1', now: NOW })
    expect(result.map((u) => u.id)).toEqual(['s-1'])
  })

  it('refuses a player', async () => {
    const { repository } = repo([suspension])
    await expect(
      new GetActiveUnavailabilitiesUseCase(repository).execute({ user: player, teamId: 'team-1', playerId: 'p-1', now: NOW }),
    ).rejects.toBeInstanceOf(ForbiddenError)
  })
})
