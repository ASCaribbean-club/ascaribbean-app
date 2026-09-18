import { describe, expect, it, vi } from 'vitest'
import type { Season } from '../../entities/season'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidSeasonInputError } from '../../errors/invalid-season-input-error'
import type { CreateSeasonInput, SeasonRepository } from '../../repositories/season-repository'
import type { User } from '../../entities/user'
import type { UserRepository } from '../../repositories/user-repository'
import { CreateSeasonUseCase, type CreateSeasonUseCaseInput } from './CreateSeasonUseCase'

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
    create: vi.fn(async (input: CreateSeasonInput) => ({ id: 'season-1', ...input }) satisfies Season),
    update: async () => {
      throw new Error('not implemented')
    },
    ...overrides,
  }
}

function validInput(overrides: Partial<CreateSeasonUseCaseInput> = {}): CreateSeasonUseCaseInput {
  return {
    actorId: 'admin-1',
    label: '2026-2027',
    startDate: '2026-08-01',
    endDate: '2027-06-30',
    cotisationAmount: null,
    ...overrides,
  }
}

describe('CreateSeasonUseCase', () => {
  it('throws ForbiddenError when the actor does not exist', async () => {
    const useCase = new CreateSeasonUseCase(fakeUserRepository(null), fakeSeasonRepository())
    await expect(useCase.execute(validInput())).rejects.toThrow(ForbiddenError)
  })

  // AC-WS-03/§3 — a section-manager must never be granted this write, even
  // by analogy with 'section:manage' (§3, "à écarter explicitement").
  it('throws ForbiddenError when the actor is a section-manager, not an admin', async () => {
    const useCase = new CreateSeasonUseCase(fakeUserRepository(sectionManagerUser()), fakeSeasonRepository())
    await expect(useCase.execute(validInput({ actorId: 'section-manager-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws InvalidSeasonInputError when label is empty', async () => {
    const useCase = new CreateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository())
    await expect(useCase.execute(validInput({ label: '  ' }))).rejects.toThrow(InvalidSeasonInputError)
  })

  it('throws InvalidSeasonInputError when startDate is missing', async () => {
    const useCase = new CreateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository())
    await expect(useCase.execute(validInput({ startDate: '' }))).rejects.toThrow(InvalidSeasonInputError)
  })

  it('throws InvalidSeasonInputError when endDate is missing', async () => {
    const useCase = new CreateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository())
    await expect(useCase.execute(validInput({ endDate: '' }))).rejects.toThrow(InvalidSeasonInputError)
  })

  // AC-WS-10/§2.4 — the one case no Postgres CHECK constraint covers.
  it('throws InvalidSeasonInputError when startDate is after endDate', async () => {
    const useCase = new CreateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository())
    await expect(useCase.execute(validInput({ startDate: '2027-06-30', endDate: '2026-08-01' }))).rejects.toThrow(InvalidSeasonInputError)
  })

  it('accepts startDate equal to endDate (a single-day season is not rejected by this domain check)', async () => {
    const create = vi.fn(async (input: CreateSeasonInput) => ({ id: 'season-1', ...input }) satisfies Season)
    const useCase = new CreateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository({ create }))

    await useCase.execute(validInput({ startDate: '2026-08-01', endDate: '2026-08-01' }))

    expect(create).toHaveBeenCalledOnce()
  })

  // §2.4 — the use case must never read existing seasons before writing
  // (TOCTOU race); findAll must not even be called.
  it('never calls findAll to pre-check overlap before creating', async () => {
    const findAll = vi.fn(async () => [])
    const useCase = new CreateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository({ findAll }))

    await useCase.execute(validInput())

    expect(findAll).not.toHaveBeenCalled()
  })

  it('creates a season with the trimmed label and both dates as given', async () => {
    const create = vi.fn(async (input: CreateSeasonInput) => ({ id: 'season-1', ...input }) satisfies Season)
    const useCase = new CreateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository({ create }))

    await useCase.execute(validInput({ label: '  2026-2027  ' }))

    expect(create).toHaveBeenCalledWith({
      label: '2026-2027',
      startDate: '2026-08-01',
      endDate: '2027-06-30',
      cotisationAmount: null,
    })
  })

  // specs/web-seasons.md §2.7/AC-WS-34 — amendement du 2026-09-17 (2).
  describe('cotisationAmount validation (AC-WS-34)', () => {
    it('accepts a null cotisationAmount ("tarif non fixé")', async () => {
      const create = vi.fn(async (input: CreateSeasonInput) => ({ id: 'season-1', ...input }) satisfies Season)
      const useCase = new CreateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository({ create }))

      await useCase.execute(validInput({ cotisationAmount: null }))

      expect(create).toHaveBeenCalledWith(expect.objectContaining({ cotisationAmount: null }))
    })

    it('accepts a zero cotisationAmount ("gratuit")', async () => {
      const create = vi.fn(async (input: CreateSeasonInput) => ({ id: 'season-1', ...input }) satisfies Season)
      const useCase = new CreateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository({ create }))

      await useCase.execute(validInput({ cotisationAmount: 0 }))

      expect(create).toHaveBeenCalledWith(expect.objectContaining({ cotisationAmount: 0 }))
    })

    it('writes a decimal cotisationAmount through to the repository, unconverted', async () => {
      const create = vi.fn(async (input: CreateSeasonInput) => ({ id: 'season-1', ...input }) satisfies Season)
      const useCase = new CreateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository({ create }))

      await useCase.execute(validInput({ cotisationAmount: 45.5 }))

      expect(create).toHaveBeenCalledWith(expect.objectContaining({ cotisationAmount: 45.5 }))
    })

    it('throws InvalidSeasonInputError when cotisationAmount is negative', async () => {
      const useCase = new CreateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository())
      await expect(useCase.execute(validInput({ cotisationAmount: -1 }))).rejects.toThrow(InvalidSeasonInputError)
    })

    it('throws InvalidSeasonInputError when cotisationAmount is not finite', async () => {
      const useCase = new CreateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository())
      await expect(useCase.execute(validInput({ cotisationAmount: Number.NaN }))).rejects.toThrow(InvalidSeasonInputError)
    })
  })

  // AC-WS-16 — an overlap is not pre-checked, it must propagate untouched
  // from the repository (which is where OverlappingSeasonError originates,
  // via SeasonRepositoryImpl -> map-supabase-error.ts).
  it('propagates whatever error the repository throws (e.g. an overlap), without swallowing or rewrapping it', async () => {
    class FakeOverlapError extends Error {}
    const create = vi.fn(async () => {
      throw new FakeOverlapError('overlap')
    })
    const useCase = new CreateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository({ create }))

    await expect(useCase.execute(validInput())).rejects.toThrow(FakeOverlapError)
  })
})
