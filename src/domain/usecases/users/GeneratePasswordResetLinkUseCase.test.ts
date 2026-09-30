import { describe, expect, it, vi } from 'vitest'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { NotFoundError } from '../../errors/not-found-error'
import { PasswordResetTargetNotActiveError } from '../../errors/password-reset-target-not-active-error'
import type { AuditLogRepository, RecordAuditLogEntryInput } from '../../repositories/audit-log-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { GeneratePasswordResetLinkUseCase, type GeneratePasswordResetLinkUseCaseInput } from './GeneratePasswordResetLinkUseCase'

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

function invitedMember(): User {
  return { id: 'member-1', fullName: 'Membre invité', email: 'membre@example.com', roles: [{ role: 'player', teamId: 'team-1' }], position: null, charterAcceptedAt: null }
}

function activeMember(): User {
  return {
    id: 'member-2',
    fullName: 'Membre actif',
    email: 'membre2@example.com',
    roles: [{ role: 'player', teamId: 'team-1' }],
    position: null,
    charterAcceptedAt: new Date('2026-01-01'),
  }
}

function fakeUserRepository(usersById: Record<string, User>, overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findById: async (id: string) => usersById[id] ?? null,
    acceptCharter: async () => {},
    findAll: async () => [],
    findAdminDirectory: async () => [],
    findMissingElementFacts: async () => [],
    updateFullName: async () => {},
    invite: vi.fn(async () => ({ url: 'https://app.example.com/activation?token_hash=abc&type=invite' })),
    reissueInvitationLink: vi.fn(async () => ({ url: 'https://app.example.com/activation?token_hash=xyz&type=magiclink' })),
    generatePasswordResetLink: vi.fn(async () => ({ url: 'https://app.example.com/update-password?token_hash=xyz&type=recovery' })),
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

function validInput(overrides: Partial<GeneratePasswordResetLinkUseCaseInput> = {}): GeneratePasswordResetLinkUseCaseInput {
  return { actorId: 'admin-1', targetUserId: 'member-2', ...overrides }
}

describe('GeneratePasswordResetLinkUseCase', () => {
  it('throws ForbiddenError when the actor does not exist', async () => {
    const useCase = new GeneratePasswordResetLinkUseCase(fakeUserRepository({ 'member-2': activeMember() }), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ actorId: 'ghost' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when the actor is not an admin', async () => {
    const useCase = new GeneratePasswordResetLinkUseCase(
      fakeUserRepository({ 'coach-1': coachUser(), 'member-2': activeMember() }),
      fakeAuditLogRepository(),
    )
    await expect(useCase.execute(validInput({ actorId: 'coach-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws NotFoundError when the target does not exist', async () => {
    const useCase = new GeneratePasswordResetLinkUseCase(fakeUserRepository({ 'admin-1': adminUser() }), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ targetUserId: 'ghost' }))).rejects.toThrow(NotFoundError)
  })

  it('throws PasswordResetTargetNotActiveError when the target has not accepted the charter yet', async () => {
    const useCase = new GeneratePasswordResetLinkUseCase(
      fakeUserRepository({ 'admin-1': adminUser(), 'member-1': invitedMember() }),
      fakeAuditLogRepository(),
    )
    await expect(useCase.execute(validInput({ targetUserId: 'member-1' }))).rejects.toThrow(PasswordResetTargetNotActiveError)
  })

  it('returns a fresh recovery link for an active target', async () => {
    const generatePasswordResetLink = vi.fn(async () => ({ url: 'https://app.example.com/update-password?token_hash=xyz&type=recovery' }))
    const useCase = new GeneratePasswordResetLinkUseCase(
      fakeUserRepository({ 'admin-1': adminUser(), 'member-2': activeMember() }, { generatePasswordResetLink }),
      fakeAuditLogRepository(),
    )

    const result = await useCase.execute(validInput())

    expect(generatePasswordResetLink).toHaveBeenCalledWith('member-2')
    expect(result).toEqual({ url: 'https://app.example.com/update-password?token_hash=xyz&type=recovery' })
  })

  // Follow-up pass to specs/web-audit-logs.md (2026-09-30 fourth addendum) —
  // a successful link generation records exactly one
  // 'password_reset.issued' audit entry, targeted at the account whose
  // password is being reset (not the acting admin), after the link itself
  // has already been generated.
  it('records a password_reset.issued audit entry once, targeted at the reset account', async () => {
    const record = vi.fn(async () => {})
    const useCase = new GeneratePasswordResetLinkUseCase(
      fakeUserRepository({ 'admin-1': adminUser(), 'member-2': activeMember() }),
      fakeAuditLogRepository({ record }),
    )

    await useCase.execute(validInput())

    expect(record).toHaveBeenCalledTimes(1)
    expect(record).toHaveBeenCalledWith({
      action: 'password_reset.issued',
      targetId: 'member-2',
      targetType: 'user',
      metadata: {},
    })
  })

  // See this use case's own top comment: an audit-write failure must not
  // reject execute()'s own promise — the link itself already succeeded.
  it('still resolves when the audit write rejects, because the link itself already succeeded', async () => {
    const record = vi.fn(async () => {
      throw new Error('audit RPC unavailable')
    })
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const useCase = new GeneratePasswordResetLinkUseCase(
      fakeUserRepository({ 'admin-1': adminUser(), 'member-2': activeMember() }),
      fakeAuditLogRepository({ record }),
    )

    await expect(useCase.execute(validInput())).resolves.toBeDefined()
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
