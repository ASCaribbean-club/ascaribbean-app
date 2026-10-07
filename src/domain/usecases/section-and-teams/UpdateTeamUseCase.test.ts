import { describe, expect, it, vi } from 'vitest'
import type { Team } from '../../entities/team'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidTeamInputError } from '../../errors/invalid-team-input-error'
import type { AuditLogRepository, RecordAuditLogEntryInput } from '../../repositories/audit-log-repository'
import type { TeamRepository, UpdateTeamInput } from '../../repositories/team-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { UpdateTeamUseCase, type UpdateTeamUseCaseInput } from './UpdateTeamUseCase'

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
    findAll: async () => [],
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

function fakeTeamRepository(overrides: Partial<TeamRepository> = {}): TeamRepository {
  return {
    findByIds: async () => [],
    findById: async () => null,
    countActiveMembers: async () => 0,
    countRosterMembers: async () => 0,
    findAllForAdmin: async () => [],
    create: async () => {
      throw new Error('not implemented')
    },
    update: vi.fn(async (id: string, input: UpdateTeamInput) => ({ id, ...input }) satisfies Team),
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

function validInput(overrides: Partial<UpdateTeamUseCaseInput> = {}): UpdateTeamUseCaseInput {
  return {
    actorId: 'admin-1',
    teamId: 'team-1',
    name: 'Groupe A',
    sectionId: 'section-1',
    seasonId: 'season-1',
    ...overrides,
  }
}

describe('UpdateTeamUseCase', () => {
  it('throws ForbiddenError when the actor does not exist', async () => {
    const useCase = new UpdateTeamUseCase(fakeUserRepository(null), fakeTeamRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput())).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when the actor is a section-manager, not an admin', async () => {
    const useCase = new UpdateTeamUseCase(fakeUserRepository(sectionManagerUser()), fakeTeamRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ actorId: 'section-manager-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws InvalidTeamInputError when name is empty', async () => {
    const useCase = new UpdateTeamUseCase(fakeUserRepository(adminUser()), fakeTeamRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ name: '' }))).rejects.toThrow(InvalidTeamInputError)
  })

  it('throws InvalidTeamInputError when sectionId is missing', async () => {
    const useCase = new UpdateTeamUseCase(fakeUserRepository(adminUser()), fakeTeamRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ sectionId: '' }))).rejects.toThrow(InvalidTeamInputError)
  })

  it('throws InvalidTeamInputError when seasonId is missing', async () => {
    const useCase = new UpdateTeamUseCase(fakeUserRepository(adminUser()), fakeTeamRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ seasonId: '' }))).rejects.toThrow(InvalidTeamInputError)
  })

  // AC-ST-24 — updates the SAME row, never creates a duplicate.
  it('updates the targeted team id with the trimmed name and given section/season ids', async () => {
    const update = vi.fn(async (id: string, input: UpdateTeamInput) => ({ id, ...input }) satisfies Team)
    const useCase = new UpdateTeamUseCase(fakeUserRepository(adminUser()), fakeTeamRepository({ update }), fakeAuditLogRepository())

    await useCase.execute(validInput({ teamId: 'team-42', name: '  Groupe B  ' }))

    expect(update).toHaveBeenCalledWith('team-42', { name: 'Groupe B', sectionId: 'section-1', seasonId: 'season-1' })
  })

  // specs/web-audit-logs.md — 2026-09-30 (fifth addendum) — a successful
  // update records exactly one 'team.updated' audit entry, targeted at the
  // team, after the write itself has already committed.
  it('records a team.updated audit entry once, targeted at the team', async () => {
    const record = vi.fn(async () => {})
    const useCase = new UpdateTeamUseCase(fakeUserRepository(adminUser()), fakeTeamRepository(), fakeAuditLogRepository({ record }))

    await useCase.execute(validInput())

    expect(record).toHaveBeenCalledTimes(1)
    expect(record).toHaveBeenCalledWith({
      action: 'team.updated',
      targetId: 'team-1',
      targetType: 'team',
      metadata: { name: 'Groupe A', sectionId: 'section-1', seasonId: 'season-1' },
    })
  })

  // See this use case's own top comment: an audit-write failure must not
  // reject execute()'s own promise — the update itself already succeeded.
  it('still resolves when the audit write rejects, because the update itself already succeeded', async () => {
    const record = vi.fn(async () => {
      throw new Error('audit RPC unavailable')
    })
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const useCase = new UpdateTeamUseCase(fakeUserRepository(adminUser()), fakeTeamRepository(), fakeAuditLogRepository({ record }))

    await expect(useCase.execute(validInput())).resolves.toBeDefined()
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
