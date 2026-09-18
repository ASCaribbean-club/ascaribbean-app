import { describe, expect, it, vi } from 'vitest'
import type { Season } from '../../entities/season'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidSeasonInputError } from '../../errors/invalid-season-input-error'
import type { SeasonRepository, UpdateSeasonInput } from '../../repositories/season-repository'
import type { User } from '../../entities/user'
import type { UserRepository } from '../../repositories/user-repository'
import { UpdateSeasonUseCase, type UpdateSeasonUseCaseInput } from './UpdateSeasonUseCase'

function adminUser(): User {
  return { id: 'admin-1', fullName: 'Administrateur', email: 'admin@example.com', roles: [{ role: 'admin' }], position: null, charterAcceptedAt: null }
}

function sectionManagerUser(): User {
  return {
    id: 'section-manager-1',
    fullName: 'Responsable de section',
    email: 'section-manager@example.com',
    roles: [{ role: 'section-manager', sectionId: 'section-1' }],
    position: null,
    charterAcceptedAt: null,
  }
}

function fakeUserRepository(user: User | null): UserRepository {
  return {
    findById: async () => user,
    acceptCharter: async () => {},
    // specs/section-and-teams.md §2.11/PO-ST-12b — added by that feature to
    // UserRepository, unrelated to this test's own assertions; stubbed so
    // the mock keeps satisfying the interface.
    findAll: () => Promise.resolve([]),
  }
}

function fakeSeasonRepository(overrides: Partial<SeasonRepository> = {}): SeasonRepository {
  return {
    findCurrent: async () => null,
    findAll: async () => [],
    create: async () => {
      throw new Error('not implemented')
    },
    update: vi.fn(async (id: string, input: UpdateSeasonInput) => ({ id, ...input }) satisfies Season),
    ...overrides,
  }
}

function validInput(overrides: Partial<UpdateSeasonUseCaseInput> = {}): UpdateSeasonUseCaseInput {
  return {
    actorId: 'admin-1',
    seasonId: 'season-1',
    label: '2026-2027',
    startDate: '2026-08-01',
    endDate: '2027-06-30',
    cotisationAmount: null,
    ...overrides,
  }
}

describe('UpdateSeasonUseCase', () => {
  it('throws ForbiddenError when the actor does not exist', async () => {
    const useCase = new UpdateSeasonUseCase(fakeUserRepository(null), fakeSeasonRepository())
    await expect(useCase.execute(validInput())).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when the actor is a section-manager, not an admin', async () => {
    const useCase = new UpdateSeasonUseCase(fakeUserRepository(sectionManagerUser()), fakeSeasonRepository())
    await expect(useCase.execute(validInput({ actorId: 'section-manager-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws InvalidSeasonInputError when label is empty', async () => {
    const useCase = new UpdateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository())
    await expect(useCase.execute(validInput({ label: '   ' }))).rejects.toThrow(InvalidSeasonInputError)
  })

  it('throws InvalidSeasonInputError when startDate is missing', async () => {
    const useCase = new UpdateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository())
    await expect(useCase.execute(validInput({ startDate: '' }))).rejects.toThrow(InvalidSeasonInputError)
  })

  it('throws InvalidSeasonInputError when endDate is missing', async () => {
    const useCase = new UpdateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository())
    await expect(useCase.execute(validInput({ endDate: '' }))).rejects.toThrow(InvalidSeasonInputError)
  })

  it('throws InvalidSeasonInputError when startDate is after endDate', async () => {
    const useCase = new UpdateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository())
    await expect(useCase.execute(validInput({ startDate: '2027-06-30', endDate: '2026-08-01' }))).rejects.toThrow(InvalidSeasonInputError)
  })

  // §2.4 — same TOCTOU reasoning as CreateSeasonUseCase; overlap is never
  // pre-checked by reading other seasons first.
  it('never calls findAll to pre-check overlap before updating', async () => {
    const findAll = vi.fn(async () => [])
    const useCase = new UpdateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository({ findAll }))

    await useCase.execute(validInput())

    expect(findAll).not.toHaveBeenCalled()
  })

  // AC-WS-24 — same row, no duplicate; and §2.3/§3 — this use case doesn't
  // re-check the season's own "ended" state before calling update(), that
  // check lives exclusively in the RLS policy.
  it('updates the same season id with the trimmed label and both dates as given', async () => {
    const update = vi.fn(async (id: string, input: UpdateSeasonInput) => ({ id, ...input }) satisfies Season)
    const useCase = new UpdateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository({ update }))

    await useCase.execute(validInput({ seasonId: 'season-42', label: '  2026-2027  ' }))

    expect(update).toHaveBeenCalledWith('season-42', {
      label: '2026-2027',
      startDate: '2026-08-01',
      endDate: '2027-06-30',
      cotisationAmount: null,
    })
  })

  // specs/web-seasons.md §2.7/AC-WS-34 — amendement du 2026-09-17 (2).
  describe('cotisationAmount validation (AC-WS-34)', () => {
    it('writes a decimal cotisationAmount through to the repository, unconverted', async () => {
      const update = vi.fn(async (id: string, input: UpdateSeasonInput) => ({ id, ...input }) satisfies Season)
      const useCase = new UpdateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository({ update }))

      await useCase.execute(validInput({ cotisationAmount: 45.5 }))

      expect(update).toHaveBeenCalledWith('season-1', expect.objectContaining({ cotisationAmount: 45.5 }))
    })

    it('accepts a null cotisationAmount (clearing a previously-set amount)', async () => {
      const update = vi.fn(async (id: string, input: UpdateSeasonInput) => ({ id, ...input }) satisfies Season)
      const useCase = new UpdateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository({ update }))

      await useCase.execute(validInput({ cotisationAmount: null }))

      expect(update).toHaveBeenCalledWith('season-1', expect.objectContaining({ cotisationAmount: null }))
    })

    it('throws InvalidSeasonInputError when cotisationAmount is negative', async () => {
      const useCase = new UpdateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository())
      await expect(useCase.execute(validInput({ cotisationAmount: -1 }))).rejects.toThrow(InvalidSeasonInputError)
    })

    it('throws InvalidSeasonInputError when cotisationAmount is not finite', async () => {
      const useCase = new UpdateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository())
      await expect(useCase.execute(validInput({ cotisationAmount: Number.NaN }))).rejects.toThrow(InvalidSeasonInputError)
    })
  })

  // AC-WS-04/§3 — a rejected write on an ended season is a repository-level
  // (RLS) failure this use case must not swallow or reinterpret.
  it('propagates whatever error the repository throws (e.g. a rejected write on an ended season), without swallowing or rewrapping it', async () => {
    class FakeForbiddenWriteError extends Error {}
    const update = vi.fn(async () => {
      throw new FakeForbiddenWriteError('ended season')
    })
    const useCase = new UpdateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository({ update }))

    await expect(useCase.execute(validInput())).rejects.toThrow(FakeForbiddenWriteError)
  })
})
