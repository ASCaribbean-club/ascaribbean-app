import { describe, expect, it, vi } from 'vitest'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidRoleAssignmentInputError } from '../../errors/invalid-role-assignment-input-error'
import type { RoleAssignmentRepository } from '../../repositories/role-assignment-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { RemoveRoleAssignmentUseCase, type RemoveRoleAssignmentUseCaseInput } from './RemoveRoleAssignmentUseCase'

function adminUser(): User {
  return { id: 'admin-1', fullName: 'Administrateur', email: 'admin@example.com', roles: [{ role: 'admin' }], position: null, charterAcceptedAt: null }
}

function volunteerUser(): User {
  return {
    id: 'volunteer-1',
    fullName: 'Bénévole',
    email: 'volunteer@example.com',
    roles: [{ role: 'volunteer' }],
    position: null,
    charterAcceptedAt: null,
  }
}

function fakeUserRepository(user: User | null): UserRepository {
  return {
    findById: async () => user,
    acceptCharter: async () => {},
    findAll: async () => [],
    findAdminDirectory: async () => [],
    findMissingElementFacts: async () => [],
    updateFullName: async () => {},
    invite: async () => ({ url: 'https://app.example.com/activation?token_hash=fake&type=invite' }),
    reissueInvitationLink: async () => ({ url: 'https://app.example.com/activation?token_hash=fake&type=magiclink' }),
  }
}

function fakeRoleAssignmentRepository(overrides: Partial<RoleAssignmentRepository> = {}): RoleAssignmentRepository {
  return {
    assignCoachToTeams: async () => {},
    assignRole: async () => {},
    editRoleAssignmentScope: async () => {},
    removeRoleAssignment: vi.fn(async () => {}),
    ...overrides,
  }
}

function validInput(overrides: Partial<RemoveRoleAssignmentUseCaseInput> = {}): RemoveRoleAssignmentUseCaseInput {
  return {
    actorId: 'admin-1',
    userId: 'target-1',
    assignment: { role: 'volunteer' },
    ...overrides,
  }
}

describe('RemoveRoleAssignmentUseCase', () => {
  it('throws ForbiddenError when the actor does not exist', async () => {
    const useCase = new RemoveRoleAssignmentUseCase(fakeUserRepository(null), fakeRoleAssignmentRepository())
    await expect(useCase.execute(validInput())).rejects.toThrow(ForbiddenError)
  })

  // AC-WU-42/AC-WU-45 — the non-negotiable line, exercised end to end at
  // the domain layer: a non-admin actor is refused, regardless of which
  // assignment they try to remove.
  it('throws ForbiddenError when the actor is not an admin', async () => {
    const useCase = new RemoveRoleAssignmentUseCase(fakeUserRepository(volunteerUser()), fakeRoleAssignmentRepository())
    await expect(useCase.execute(validInput({ actorId: 'volunteer-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws InvalidRoleAssignmentInputError when userId is missing', async () => {
    const useCase = new RemoveRoleAssignmentUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository())
    await expect(useCase.execute(validInput({ userId: '' }))).rejects.toThrow(InvalidRoleAssignmentInputError)
  })

  it('removes a club-wide (unscoped) role assignment', async () => {
    const removeRoleAssignment = vi.fn(async () => {})
    const useCase = new RemoveRoleAssignmentUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository({ removeRoleAssignment }))

    await useCase.execute(validInput({ userId: 'target-1', assignment: { role: 'treasurer' } }))

    expect(removeRoleAssignment).toHaveBeenCalledWith('target-1', { role: 'treasurer' })
  })

  it("removes a player's team-scoped assignment", async () => {
    const removeRoleAssignment = vi.fn(async () => {})
    const useCase = new RemoveRoleAssignmentUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository({ removeRoleAssignment }))

    await useCase.execute(validInput({ userId: 'player-1', assignment: { role: 'player', teamId: 'team-1' } }))

    expect(removeRoleAssignment).toHaveBeenCalledWith('player-1', { role: 'player', teamId: 'team-1' })
  })

  // §2.3 — removal deletes EVERY row a multi-team coach assignment
  // aggregates, in one call, never just one team (that's a scope edit).
  it("removes every team of a multi-team coach's assignment in one call", async () => {
    const removeRoleAssignment = vi.fn(async () => {})
    const useCase = new RemoveRoleAssignmentUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository({ removeRoleAssignment }))

    await useCase.execute(validInput({ userId: 'coach-1', assignment: { role: 'coach', teamIds: ['team-1', 'team-2'] } }))

    expect(removeRoleAssignment).toHaveBeenCalledWith('coach-1', { role: 'coach', teamIds: ['team-1', 'team-2'] })
    expect(removeRoleAssignment).toHaveBeenCalledTimes(1)
  })

  // §2.3 — removing the account's LAST assignment is allowed, no extra
  // guard: the use case doesn't even know how many roles the account holds
  // (that's presentation/'s own, informational concern, never a domain
  // block).
  it("allows removing the account's last remaining assignment", async () => {
    const removeRoleAssignment = vi.fn(async () => {})
    const useCase = new RemoveRoleAssignmentUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository({ removeRoleAssignment }))

    await expect(useCase.execute(validInput({ assignment: { role: 'medical-referent' } }))).resolves.toBeUndefined()
  })

  it('propagates whatever error the repository throws, without swallowing or rewrapping it', async () => {
    class FakeRepositoryError extends Error {}
    const removeRoleAssignment = vi.fn(async () => {
      throw new FakeRepositoryError('boom')
    })
    const useCase = new RemoveRoleAssignmentUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository({ removeRoleAssignment }))

    await expect(useCase.execute(validInput())).rejects.toThrow(FakeRepositoryError)
  })
})
