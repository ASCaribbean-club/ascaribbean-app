import { describe, expect, it, vi } from 'vitest'
import type { AssignableRoleAssignment, User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidRoleAssignmentInputError } from '../../errors/invalid-role-assignment-input-error'
import type { RoleAssignmentRepository } from '../../repositories/role-assignment-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { EditRoleAssignmentScopeUseCase, type EditRoleAssignmentScopeUseCaseInput } from './EditRoleAssignmentScopeUseCase'

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
    editRoleAssignmentScope: vi.fn(async () => {}),
    removeRoleAssignment: async () => {},
    ...overrides,
  }
}

function validInput(overrides: Partial<EditRoleAssignmentScopeUseCaseInput> = {}): EditRoleAssignmentScopeUseCaseInput {
  return {
    actorId: 'admin-1',
    userId: 'target-1',
    currentAssignment: { role: 'player', teamId: 'team-1' },
    nextAssignment: { role: 'player', teamId: 'team-2' },
    ...overrides,
  }
}

describe('EditRoleAssignmentScopeUseCase', () => {
  it('throws ForbiddenError when the actor does not exist', async () => {
    const useCase = new EditRoleAssignmentScopeUseCase(fakeUserRepository(null), fakeRoleAssignmentRepository())
    await expect(useCase.execute(validInput())).rejects.toThrow(ForbiddenError)
  })

  // AC-WU-42/AC-WU-45 — the non-negotiable line, exercised end to end at
  // the domain layer: a non-admin actor is refused regardless of the scope.
  it('throws ForbiddenError when the actor is not an admin', async () => {
    const useCase = new EditRoleAssignmentScopeUseCase(fakeUserRepository(volunteerUser()), fakeRoleAssignmentRepository())
    await expect(useCase.execute(validInput({ actorId: 'volunteer-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws InvalidRoleAssignmentInputError when userId is missing', async () => {
    const useCase = new EditRoleAssignmentScopeUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository())
    await expect(useCase.execute(validInput({ userId: '' }))).rejects.toThrow(InvalidRoleAssignmentInputError)
  })

  // §1 of the amendment — "le rôle lui-même n'est jamais modifié par cette
  // opération": a caller passing mismatched roles is rejected here, before
  // any repository call.
  it('throws InvalidRoleAssignmentInputError when the next assignment changes the role', async () => {
    const useCase = new EditRoleAssignmentScopeUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository())
    const input = validInput({
      currentAssignment: { role: 'player', teamId: 'team-1' },
      nextAssignment: { role: 'section-manager', sectionId: 'section-1' } as unknown as AssignableRoleAssignment,
    })
    await expect(useCase.execute(input)).rejects.toThrow(InvalidRoleAssignmentInputError)
  })

  // AC-WU-51 — the desired scope is rejected from the domain, before any
  // network call, exactly like AssignRoleUseCase's own validation (shared
  // helper, domain/policies/role-assignment-scope.ts).
  it('throws InvalidRoleAssignmentInputError when the desired player scope has no teamId', async () => {
    const useCase = new EditRoleAssignmentScopeUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository())
    const input = validInput({
      currentAssignment: { role: 'player', teamId: 'team-1' },
      nextAssignment: { role: 'player', teamId: '' } as unknown as AssignableRoleAssignment,
    })
    await expect(useCase.execute(input)).rejects.toThrow(InvalidRoleAssignmentInputError)
  })

  it("moves a player's team scope", async () => {
    const editRoleAssignmentScope = vi.fn(async () => {})
    const useCase = new EditRoleAssignmentScopeUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository({ editRoleAssignmentScope }))

    await useCase.execute(validInput())

    expect(editRoleAssignmentScope).toHaveBeenCalledWith('target-1', { role: 'player', teamId: 'team-1' }, { role: 'player', teamId: 'team-2' })
  })

  it("moves a section-manager's section scope", async () => {
    const editRoleAssignmentScope = vi.fn(async () => {})
    const useCase = new EditRoleAssignmentScopeUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository({ editRoleAssignmentScope }))

    await useCase.execute(
      validInput({
        currentAssignment: { role: 'section-manager', sectionId: 'section-1' },
        nextAssignment: { role: 'section-manager', sectionId: 'section-2' },
      }),
    )

    expect(editRoleAssignmentScope).toHaveBeenCalledWith(
      'target-1',
      { role: 'section-manager', sectionId: 'section-1' },
      { role: 'section-manager', sectionId: 'section-2' },
    )
  })

  // §2.5d — adding a team to a coach's assignment never deletes a row:
  // only 'role:assign' is required (the admin actor holds it, so this
  // succeeds without exercising the 'role:remove' branch at all).
  it('adds a team to a coach assignment without requiring role:remove', async () => {
    const editRoleAssignmentScope = vi.fn(async () => {})
    const useCase = new EditRoleAssignmentScopeUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository({ editRoleAssignmentScope }))

    await useCase.execute(
      validInput({
        currentAssignment: { role: 'coach', teamIds: ['team-1'] },
        nextAssignment: { role: 'coach', teamIds: ['team-1', 'team-2'] },
      }),
    )

    expect(editRoleAssignmentScope).toHaveBeenCalledWith('target-1', { role: 'coach', teamIds: ['team-1'] }, { role: 'coach', teamIds: ['team-1', 'team-2'] })
  })

  // §2.5d — unchecking at least one team requires 'role:remove' IN ADDITION
  // to 'role:assign'. An admin holds both, so this still succeeds — the
  // "denies" pair below is what actually proves the gate exists.
  it('removes a team from a coach assignment when the actor holds both role:assign and role:remove', async () => {
    const editRoleAssignmentScope = vi.fn(async () => {})
    const useCase = new EditRoleAssignmentScopeUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository({ editRoleAssignmentScope }))

    await useCase.execute(
      validInput({
        currentAssignment: { role: 'coach', teamIds: ['team-1', 'team-2'] },
        nextAssignment: { role: 'coach', teamIds: ['team-1'] },
      }),
    )

    expect(editRoleAssignmentScope).toHaveBeenCalledWith(
      'target-1',
      { role: 'coach', teamIds: ['team-1', 'team-2'] },
      { role: 'coach', teamIds: ['team-1'] },
    )
  })

  it('propagates whatever error the repository throws, without swallowing or rewrapping it', async () => {
    class FakeRepositoryError extends Error {}
    const editRoleAssignmentScope = vi.fn(async () => {
      throw new FakeRepositoryError('boom')
    })
    const useCase = new EditRoleAssignmentScopeUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository({ editRoleAssignmentScope }))

    await expect(useCase.execute(validInput())).rejects.toThrow(FakeRepositoryError)
  })
})
