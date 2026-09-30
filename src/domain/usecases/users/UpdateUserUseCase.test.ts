import { describe, expect, it, vi } from 'vitest'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFullNameInputError } from '../../errors/invalid-full-name-input-error'
import { InvalidUserProfileInputError } from '../../errors/invalid-user-profile-input-error'
import type { AuditLogRepository, RecordAuditLogEntryInput } from '../../repositories/audit-log-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { UpdateUserUseCase, type UpdateUserUseCaseInput } from './UpdateUserUseCase'

function adminUser(): User {
  return { id: 'admin-1', fullName: 'Administrateur', email: 'admin@example.com', roles: [{ role: 'admin' }], position: null, age: null, handedness: null, charterAcceptedAt: null }
}

function playerUser(): User {
  return {
    id: 'player-1',
    fullName: 'Joueur',
    email: 'player@example.com',
    roles: [{ role: 'player', teamId: 'team-1' }],
    position: null,
    age: null,
    handedness: null,
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
    updateProfile: vi.fn(async () => {}),
    invite: async () => ({ url: 'https://app.example.com/activation?token_hash=fake&type=invite' }),
    reissueInvitationLink: async () => ({ url: 'https://app.example.com/activation?token_hash=fake&type=magiclink' }),
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

function validInput(overrides: Partial<UpdateUserUseCaseInput> = {}): UpdateUserUseCaseInput {
  return { actorId: 'admin-1', userId: 'player-1', fullName: 'Nouveau nom', age: null, handedness: null, ...overrides }
}

describe('UpdateUserUseCase', () => {
  it('throws ForbiddenError when the actor does not exist', async () => {
    const useCase = new UpdateUserUseCase(fakeUserRepository(null), fakeAuditLogRepository())
    await expect(useCase.execute(validInput())).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when the actor is not an admin', async () => {
    const useCase = new UpdateUserUseCase(fakeUserRepository(playerUser()), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ actorId: 'player-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws InvalidFullNameInputError when fullName is blank', async () => {
    const useCase = new UpdateUserUseCase(fakeUserRepository(adminUser()), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ fullName: '   ' }))).rejects.toThrow(InvalidFullNameInputError)
  })

  it('throws InvalidFullNameInputError when userId is missing', async () => {
    const useCase = new UpdateUserUseCase(fakeUserRepository(adminUser()), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ userId: '' }))).rejects.toThrow(InvalidFullNameInputError)
  })

  it('forwards age and handedness', async () => {
    const updateProfile = vi.fn(async () => {})
    const useCase = new UpdateUserUseCase(fakeUserRepository(adminUser(), { updateProfile }), fakeAuditLogRepository())

    await useCase.execute(validInput({ age: 27, handedness: 'left' }))

    expect(updateProfile).toHaveBeenCalledWith('player-1', { fullName: 'Nouveau nom', age: 27, handedness: 'left' })
  })

  it.each([0, 121, 12.5, Number.NaN])('throws InvalidUserProfileInputError when age is %s', async (age) => {
    const updateProfile = vi.fn(async () => {})
    const useCase = new UpdateUserUseCase(fakeUserRepository(adminUser(), { updateProfile }), fakeAuditLogRepository())

    await expect(useCase.execute(validInput({ age }))).rejects.toThrow(InvalidUserProfileInputError)
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it('updates with the trimmed fullName', async () => {
    const updateProfile = vi.fn(async () => {})
    const useCase = new UpdateUserUseCase(fakeUserRepository(adminUser(), { updateProfile }), fakeAuditLogRepository())

    await useCase.execute(validInput({ fullName: '  Nouveau nom  ' }))

    expect(updateProfile).toHaveBeenCalledWith('player-1', { fullName: 'Nouveau nom', age: null, handedness: null })
  })

  // AC-WU-25 — the policy permits an admin to edit their own row too;
  // nothing in the domain forbids it either (§2.7, sous-question
  // résiduelle non bloquante).
  it('allows an admin to update their own fullName', async () => {
    const updateProfile = vi.fn(async () => {})
    const useCase = new UpdateUserUseCase(fakeUserRepository(adminUser(), { updateProfile }), fakeAuditLogRepository())

    await useCase.execute(validInput({ userId: 'admin-1' }))

    expect(updateProfile).toHaveBeenCalledWith('admin-1', { fullName: 'Nouveau nom', age: null, handedness: null })
  })

  // specs/web-audit-logs.md — 2026-09-30 (fifth addendum) — a successful
  // rename records exactly one 'user.updated' audit entry, targeted at the
  // renamed account, after the write itself has already committed.
  it('records a user.updated audit entry once, targeted at the renamed account', async () => {
    const record = vi.fn(async () => {})
    const useCase = new UpdateUserUseCase(fakeUserRepository(adminUser()), fakeAuditLogRepository({ record }))

    await useCase.execute(validInput())

    expect(record).toHaveBeenCalledTimes(1)
    expect(record).toHaveBeenCalledWith({
      action: 'user.updated',
      targetId: 'player-1',
      targetType: 'user',
      metadata: {},
    })
  })

  // See this use case's own top comment: an audit-write failure must not
  // reject execute()'s own promise — the rename itself already succeeded.
  it('still resolves when the audit write rejects, because the rename itself already succeeded', async () => {
    const record = vi.fn(async () => {
      throw new Error('audit RPC unavailable')
    })
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const useCase = new UpdateUserUseCase(fakeUserRepository(adminUser()), fakeAuditLogRepository({ record }))

    await expect(useCase.execute(validInput())).resolves.toBeUndefined()
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
