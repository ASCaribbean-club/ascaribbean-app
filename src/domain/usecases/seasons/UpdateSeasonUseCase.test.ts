import { describe, expect, it, vi } from 'vitest'
import type { Season } from '../../entities/season'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidSeasonInputError } from '../../errors/invalid-season-input-error'
import type { AuditLogRepository, RecordAuditLogEntryInput } from '../../repositories/audit-log-repository'
import type { SeasonRepository, UpdateSeasonInput } from '../../repositories/season-repository'
import type { User } from '../../entities/user'
import type { UserRepository } from '../../repositories/user-repository'
import { UpdateSeasonUseCase, type UpdateSeasonUseCaseInput } from './UpdateSeasonUseCase'

function adminUser(): User {
  return { id: 'admin-1', fullName: 'Administrateur', email: 'admin@example.com', roles: [{ role: 'admin' }], position: null, age: null, handedness: null, charterAcceptedAt: null }
}

function sectionManagerUser(): User {
  return {
    id: 'section-manager-1',
    fullName: 'Responsable de section',
    email: 'section-manager@example.com',
    roles: [{ role: 'section-manager', sectionId: 'section-1' }],
    position: null,
    age: null,
    handedness: null,
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
    // specs/web-users.md §2.10 — added by that feature to UserRepository,
    // unrelated to this test's own assertions; stubbed so the fake keeps
    // satisfying the interface.
    findAdminDirectory: async () => [],
    findMissingElementFacts: async () => [],
    updateProfile: async () => {},
    invite: async () => ({ url: 'https://app.example.com/activation?token_hash=fake&type=invite' }),
    reissueInvitationLink: async () => ({ url: 'https://app.example.com/activation?token_hash=fake&type=magiclink' }),
    generatePasswordResetLink: async () => ({ url: 'https://app.example.com/update-password?token_hash=fake&type=recovery' }),
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

function fakeAuditLogRepository(overrides: Partial<AuditLogRepository> = {}): AuditLogRepository {
  return {
    list: async () => ({ entries: [], hasMore: false }),
    record: vi.fn(async (_entry: RecordAuditLogEntryInput) => {}),
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
    const useCase = new UpdateSeasonUseCase(fakeUserRepository(null), fakeSeasonRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput())).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when the actor is a section-manager, not an admin', async () => {
    const useCase = new UpdateSeasonUseCase(fakeUserRepository(sectionManagerUser()), fakeSeasonRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ actorId: 'section-manager-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws InvalidSeasonInputError when label is empty', async () => {
    const useCase = new UpdateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ label: '   ' }))).rejects.toThrow(InvalidSeasonInputError)
  })

  it('throws InvalidSeasonInputError when startDate is missing', async () => {
    const useCase = new UpdateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ startDate: '' }))).rejects.toThrow(InvalidSeasonInputError)
  })

  it('throws InvalidSeasonInputError when endDate is missing', async () => {
    const useCase = new UpdateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ endDate: '' }))).rejects.toThrow(InvalidSeasonInputError)
  })

  it('throws InvalidSeasonInputError when startDate is after endDate', async () => {
    const useCase = new UpdateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ startDate: '2027-06-30', endDate: '2026-08-01' }))).rejects.toThrow(InvalidSeasonInputError)
  })

  // §2.4 — same TOCTOU reasoning as CreateSeasonUseCase; overlap is never
  // pre-checked by reading other seasons first.
  it('never calls findAll to pre-check overlap before updating', async () => {
    const findAll = vi.fn(async () => [])
    const useCase = new UpdateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository({ findAll }), fakeAuditLogRepository())

    await useCase.execute(validInput())

    expect(findAll).not.toHaveBeenCalled()
  })

  // AC-WS-24 — same row, no duplicate; and §2.3/§3 — this use case doesn't
  // re-check the season's own "ended" state before calling update(), that
  // check lives exclusively in the RLS policy.
  it('updates the same season id with the trimmed label and both dates as given', async () => {
    const update = vi.fn(async (id: string, input: UpdateSeasonInput) => ({ id, ...input }) satisfies Season)
    const useCase = new UpdateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository({ update }), fakeAuditLogRepository())

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
      const useCase = new UpdateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository({ update }), fakeAuditLogRepository())

      await useCase.execute(validInput({ cotisationAmount: 45.5 }))

      expect(update).toHaveBeenCalledWith('season-1', expect.objectContaining({ cotisationAmount: 45.5 }))
    })

    it('accepts a null cotisationAmount (clearing a previously-set amount)', async () => {
      const update = vi.fn(async (id: string, input: UpdateSeasonInput) => ({ id, ...input }) satisfies Season)
      const useCase = new UpdateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository({ update }), fakeAuditLogRepository())

      await useCase.execute(validInput({ cotisationAmount: null }))

      expect(update).toHaveBeenCalledWith('season-1', expect.objectContaining({ cotisationAmount: null }))
    })

    it('throws InvalidSeasonInputError when cotisationAmount is negative', async () => {
      const useCase = new UpdateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository(), fakeAuditLogRepository())
      await expect(useCase.execute(validInput({ cotisationAmount: -1 }))).rejects.toThrow(InvalidSeasonInputError)
    })

    it('throws InvalidSeasonInputError when cotisationAmount is not finite', async () => {
      const useCase = new UpdateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository(), fakeAuditLogRepository())
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
    const useCase = new UpdateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository({ update }), fakeAuditLogRepository())

    await expect(useCase.execute(validInput())).rejects.toThrow(FakeForbiddenWriteError)
  })

  // specs/web-audit-logs.md — 2026-09-30 (fifth addendum) — a successful
  // update records exactly one 'season.updated' audit entry, targeted at
  // the season, after the write itself has already committed.
  it('records a season.updated audit entry once, targeted at the season', async () => {
    const record = vi.fn(async () => {})
    const useCase = new UpdateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository(), fakeAuditLogRepository({ record }))

    await useCase.execute(validInput())

    expect(record).toHaveBeenCalledTimes(1)
    expect(record).toHaveBeenCalledWith({
      action: 'season.updated',
      targetId: 'season-1',
      targetType: 'season',
      metadata: { label: '2026-2027' },
    })
  })

  // See this use case's own top comment: an audit-write failure must not
  // reject execute()'s own promise — the update itself already succeeded.
  it('still resolves when the audit write rejects, because the update itself already succeeded', async () => {
    const record = vi.fn(async () => {
      throw new Error('audit RPC unavailable')
    })
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const useCase = new UpdateSeasonUseCase(fakeUserRepository(adminUser()), fakeSeasonRepository(), fakeAuditLogRepository({ record }))

    await expect(useCase.execute(validInput())).resolves.toBeDefined()
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
