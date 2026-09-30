import { describe, expect, it, vi } from 'vitest'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidCoachAssignmentInputError } from '../../errors/invalid-coach-assignment-input-error'
import type { AuditLogRepository, RecordAuditLogEntryInput } from '../../repositories/audit-log-repository'
import type { RoleAssignmentRepository } from '../../repositories/role-assignment-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { AssignCoachToTeamsUseCase, type AssignCoachToTeamsUseCaseInput } from './AssignCoachToTeamsUseCase'

function adminUser(): User {
  return { id: 'admin-1', fullName: 'Administrateur', email: 'admin@example.com', roles: [{ role: 'admin' }], position: null, charterAcceptedAt: null }
}

function coachUser(): User {
  return {
    id: 'coach-1',
    fullName: 'Coach',
    email: 'coach@example.com',
    roles: [{ role: 'coach', teamIds: ['team-1'] }],
    position: null,
    charterAcceptedAt: null,
  }
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

function fakeRoleAssignmentRepository(overrides: Partial<RoleAssignmentRepository> = {}): RoleAssignmentRepository {
  return {
    assignCoachToTeams: vi.fn(async () => {}),
    // specs/web-users.md §2.6 and
    // specs/web-users-role-edit-remove.md §2.7 — added by those features to
    // RoleAssignmentRepository, unrelated to this test's own assertions;
    // stubbed so the fake keeps satisfying the interface.
    assignRole: vi.fn(async () => {}),
    editRoleAssignmentScope: vi.fn(async () => {}),
    removeRoleAssignment: vi.fn(async () => {}),
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

function validInput(overrides: Partial<AssignCoachToTeamsUseCaseInput> = {}): AssignCoachToTeamsUseCaseInput {
  return {
    actorId: 'admin-1',
    userId: 'coach-1',
    teamIds: ['team-1', 'team-2'],
    ...overrides,
  }
}

describe('AssignCoachToTeamsUseCase', () => {
  it('throws ForbiddenError when the actor does not exist', async () => {
    const useCase = new AssignCoachToTeamsUseCase(fakeUserRepository(null), fakeRoleAssignmentRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput())).rejects.toThrow(ForbiddenError)
  })

  // §3/AC-ST-39 — a coach must never be able to self-assign.
  it('throws ForbiddenError when the actor is a coach, not an admin', async () => {
    const useCase = new AssignCoachToTeamsUseCase(fakeUserRepository(coachUser()), fakeRoleAssignmentRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ actorId: 'coach-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when the actor is a section-manager, not an admin', async () => {
    const useCase = new AssignCoachToTeamsUseCase(fakeUserRepository(sectionManagerUser()), fakeRoleAssignmentRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ actorId: 'section-manager-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws InvalidCoachAssignmentInputError when userId is missing', async () => {
    const useCase = new AssignCoachToTeamsUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ userId: '' }))).rejects.toThrow(InvalidCoachAssignmentInputError)
  })

  // §2.10/AC-ST-40 — submitting the dialog with no team checked is rejected
  // from the domain, before any network call.
  it('throws InvalidCoachAssignmentInputError when teamIds is empty', async () => {
    const useCase = new AssignCoachToTeamsUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ teamIds: [] }))).rejects.toThrow(InvalidCoachAssignmentInputError)
  })

  it('assigns the given userId to every given teamId', async () => {
    const assignCoachToTeams = vi.fn(async () => {})
    const useCase = new AssignCoachToTeamsUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository({ assignCoachToTeams }), fakeAuditLogRepository())

    await useCase.execute(validInput({ userId: 'coach-1', teamIds: ['team-1', 'team-2'] }))

    expect(assignCoachToTeams).toHaveBeenCalledWith('coach-1', ['team-1', 'team-2'])
  })

  it('propagates whatever error the repository throws, without swallowing or rewrapping it', async () => {
    class FakeRepositoryError extends Error {}
    const assignCoachToTeams = vi.fn(async () => {
      throw new FakeRepositoryError('boom')
    })
    const useCase = new AssignCoachToTeamsUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository({ assignCoachToTeams }), fakeAuditLogRepository())

    await expect(useCase.execute(validInput())).rejects.toThrow(FakeRepositoryError)
  })

  // Follow-up pass to specs/web-audit-logs.md (2026-09-30 addendum) — a
  // successful coach assignment records exactly one 'role.granted' audit
  // entry, targeted at the affected account (not the actor), after the
  // coach assignment itself has already committed.
  it('records a role.granted audit entry once, targeted at the affected account', async () => {
    const record = vi.fn(async () => {})
    const useCase = new AssignCoachToTeamsUseCase(
      fakeUserRepository(adminUser()),
      fakeRoleAssignmentRepository(),
      fakeAuditLogRepository({ record }),
    )

    await useCase.execute(validInput({ userId: 'coach-1', teamIds: ['team-1', 'team-2'] }))

    expect(record).toHaveBeenCalledTimes(1)
    expect(record).toHaveBeenCalledWith({
      action: 'role.granted',
      targetId: 'coach-1',
      targetType: 'user',
      metadata: { role: 'coach', teamIds: ['team-1', 'team-2'] },
    })
  })

  // See this use case's own top comment: an audit-write failure must not
  // reject execute()'s own promise — the coach assignment itself already
  // succeeded.
  it('still resolves when the audit write rejects, because the coach assignment itself already succeeded', async () => {
    const record = vi.fn(async () => {
      throw new Error('audit RPC unavailable')
    })
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const useCase = new AssignCoachToTeamsUseCase(
      fakeUserRepository(adminUser()),
      fakeRoleAssignmentRepository(),
      fakeAuditLogRepository({ record }),
    )

    await expect(useCase.execute(validInput())).resolves.toBeUndefined()
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
