import { describe, expect, it, vi } from 'vitest'
import type { Section } from '../../entities/section'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidSectionInputError } from '../../errors/invalid-section-input-error'
import type { AuditLogRepository, RecordAuditLogEntryInput } from '../../repositories/audit-log-repository'
import type { SectionRepository, UpdateSectionInput } from '../../repositories/section-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { UpdateSectionUseCase, type UpdateSectionUseCaseInput } from './UpdateSectionUseCase'

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
    findAll: async () => [],
    // specs/web-users.md §2.10 — added by that feature to UserRepository,
    // unrelated to this test's own assertions; stubbed so the fake keeps
    // satisfying the interface.
    findAdminDirectory: async () => [],
    findMissingElementFacts: async () => [],
    updateFullName: async () => {},
    invite: async () => ({ url: 'https://app.example.com/activation?token_hash=fake&type=invite' }),
    reissueInvitationLink: async () => ({ url: 'https://app.example.com/activation?token_hash=fake&type=magiclink' }),
    generatePasswordResetLink: async () => ({ url: 'https://app.example.com/update-password?token_hash=fake&type=recovery' }),
  }
}

function fakeSectionRepository(overrides: Partial<SectionRepository> = {}): SectionRepository {
  return {
    findById: async () => null,
    findAll: async () => [],
    create: async () => {
      throw new Error('not implemented')
    },
    update: vi.fn(async (id: string, input: UpdateSectionInput) => ({ id, createdAt: '2026-09-17T00:00:00.000Z', ...input }) satisfies Section),
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

function validInput(overrides: Partial<UpdateSectionUseCaseInput> = {}): UpdateSectionUseCaseInput {
  return {
    actorId: 'admin-1',
    sectionId: 'section-1',
    name: 'Senior masculin',
    type: 'football',
    ...overrides,
  }
}

describe('UpdateSectionUseCase', () => {
  it('throws ForbiddenError when the actor does not exist', async () => {
    const useCase = new UpdateSectionUseCase(fakeUserRepository(null), fakeSectionRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput())).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when the actor is a section-manager, not an admin', async () => {
    const useCase = new UpdateSectionUseCase(fakeUserRepository(sectionManagerUser()), fakeSectionRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ actorId: 'section-manager-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws InvalidSectionInputError when name is empty', async () => {
    const useCase = new UpdateSectionUseCase(fakeUserRepository(adminUser()), fakeSectionRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ name: '' }))).rejects.toThrow(InvalidSectionInputError)
  })

  it('throws InvalidSectionInputError when type is not one of the four allowed values', async () => {
    const useCase = new UpdateSectionUseCase(fakeUserRepository(adminUser()), fakeSectionRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ type: 'basketball' }))).rejects.toThrow(InvalidSectionInputError)
  })

  // AC-ST-24 — updates the SAME row, never creates a duplicate.
  it('updates the targeted section id with the trimmed name and given type', async () => {
    const update = vi.fn(async (id: string, input: UpdateSectionInput) => ({ id, createdAt: '2026-09-17T00:00:00.000Z', ...input }) satisfies Section)
    const useCase = new UpdateSectionUseCase(fakeUserRepository(adminUser()), fakeSectionRepository({ update }), fakeAuditLogRepository())

    await useCase.execute(validInput({ sectionId: 'section-42', name: '  Senior féminin  ', type: 'esport' }))

    expect(update).toHaveBeenCalledWith('section-42', { name: 'Senior féminin', type: 'esport' })
  })

  // specs/web-audit-logs.md — 2026-09-30 (fifth addendum) — a successful
  // update records exactly one 'section.updated' audit entry, targeted at
  // the section, after the write itself has already committed.
  it('records a section.updated audit entry once, targeted at the section', async () => {
    const record = vi.fn(async () => {})
    const useCase = new UpdateSectionUseCase(fakeUserRepository(adminUser()), fakeSectionRepository(), fakeAuditLogRepository({ record }))

    await useCase.execute(validInput())

    expect(record).toHaveBeenCalledTimes(1)
    expect(record).toHaveBeenCalledWith({
      action: 'section.updated',
      targetId: 'section-1',
      targetType: 'section',
      metadata: { name: 'Senior masculin', type: 'football' },
    })
  })

  // See this use case's own top comment: an audit-write failure must not
  // reject execute()'s own promise — the update itself already succeeded.
  it('still resolves when the audit write rejects, because the update itself already succeeded', async () => {
    const record = vi.fn(async () => {
      throw new Error('audit RPC unavailable')
    })
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const useCase = new UpdateSectionUseCase(fakeUserRepository(adminUser()), fakeSectionRepository(), fakeAuditLogRepository({ record }))

    await expect(useCase.execute(validInput())).resolves.toBeDefined()
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
