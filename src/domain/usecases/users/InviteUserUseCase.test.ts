import { describe, expect, it, vi } from 'vitest'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidUserInputError } from '../../errors/invalid-user-input-error'
import type { AuditLogRepository, RecordAuditLogEntryInput } from '../../repositories/audit-log-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { InviteUserUseCase, type InviteUserUseCaseInput } from './InviteUserUseCase'

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

function fakeUserRepository(user: User | null, overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findById: async () => user,
    acceptCharter: async () => {},
    findAll: async () => [],
    findAdminDirectory: async () => [],
    findMissingElementFacts: async () => [],
    updateFullName: async () => {},
    invite: vi.fn(async () => ({ url: 'https://app.example.com/activation?token_hash=abc&type=invite', userId: 'new-user-1' })),
    reissueInvitationLink: vi.fn(async () => ({ url: 'https://app.example.com/activation?token_hash=xyz&type=magiclink' })),
    generatePasswordResetLink: async () => ({ url: 'https://app.example.com/update-password?token_hash=fake&type=recovery' }),
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

function validInput(overrides: Partial<InviteUserUseCaseInput> = {}): InviteUserUseCaseInput {
  return { actorId: 'admin-1', fullName: 'Nouveau membre', email: 'nouveau@example.com', ...overrides }
}

describe('InviteUserUseCase', () => {
  it('throws ForbiddenError when the actor does not exist', async () => {
    const useCase = new InviteUserUseCase(fakeUserRepository(null), fakeAuditLogRepository())
    await expect(useCase.execute(validInput())).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when the actor is not an admin', async () => {
    const useCase = new InviteUserUseCase(fakeUserRepository(coachUser()), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ actorId: 'coach-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws InvalidUserInputError when fullName is blank', async () => {
    const useCase = new InviteUserUseCase(fakeUserRepository(adminUser()), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ fullName: '   ' }))).rejects.toThrow(InvalidUserInputError)
  })

  it('throws InvalidUserInputError when email is blank', async () => {
    const useCase = new InviteUserUseCase(fakeUserRepository(adminUser()), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ email: '' }))).rejects.toThrow(InvalidUserInputError)
  })

  it('invites with the trimmed fullName and email', async () => {
    const invite = vi.fn(async () => ({ url: 'https://app.example.com/activation?token_hash=abc&type=invite', userId: 'new-user-1' }))
    const useCase = new InviteUserUseCase(fakeUserRepository(adminUser(), { invite }), fakeAuditLogRepository())

    await useCase.execute(validInput({ fullName: '  Nouveau membre  ', email: '  nouveau@example.com  ' }))

    expect(invite).toHaveBeenCalledWith({ fullName: 'Nouveau membre', email: 'nouveau@example.com' })
  })

  it('returns the activation link the repository produced', async () => {
    const invite = vi.fn(async () => ({ url: 'https://app.example.com/activation?token_hash=abc&type=invite', userId: 'new-user-1' }))
    const useCase = new InviteUserUseCase(fakeUserRepository(adminUser(), { invite }), fakeAuditLogRepository())

    const result = await useCase.execute(validInput())

    expect(result).toEqual({ url: 'https://app.example.com/activation?token_hash=abc&type=invite', userId: 'new-user-1' })
  })

  it('propagates whatever error the repository throws, without swallowing or rewrapping it', async () => {
    class FakeRepositoryError extends Error {}
    const invite = vi.fn(async () => {
      throw new FakeRepositoryError('boom')
    })
    const useCase = new InviteUserUseCase(fakeUserRepository(adminUser(), { invite }), fakeAuditLogRepository())

    await expect(useCase.execute(validInput())).rejects.toThrow(FakeRepositoryError)
  })

  // Follow-up pass to specs/web-audit-logs.md (2026-09-30 fourth addendum) —
  // a successful invitation records exactly one 'user.invited' audit entry,
  // targeted at the NEWLY CREATED account's id (threaded back via
  // InvitationLink.userId, not the actor), after the invitation itself has
  // already committed.
  it('records a user.invited audit entry once, targeted at the newly created account', async () => {
    const record = vi.fn(async () => {})
    const useCase = new InviteUserUseCase(fakeUserRepository(adminUser()), fakeAuditLogRepository({ record }))

    await useCase.execute(validInput({ fullName: 'Nouveau membre', email: 'nouveau@example.com' }))

    expect(record).toHaveBeenCalledTimes(1)
    expect(record).toHaveBeenCalledWith({
      action: 'user.invited',
      targetId: 'new-user-1',
      targetType: 'user',
      metadata: { email: 'nouveau@example.com', fullName: 'Nouveau membre' },
    })
  })

  // See this use case's own top comment: an audit-write failure must not
  // reject execute()'s own promise — the invitation itself already
  // succeeded.
  it('still resolves when the audit write rejects, because the invitation itself already succeeded', async () => {
    const record = vi.fn(async () => {
      throw new Error('audit RPC unavailable')
    })
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const useCase = new InviteUserUseCase(fakeUserRepository(adminUser()), fakeAuditLogRepository({ record }))

    await expect(useCase.execute(validInput())).resolves.toBeDefined()
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
