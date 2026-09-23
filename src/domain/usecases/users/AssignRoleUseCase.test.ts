import { describe, expect, it, vi } from 'vitest'
import type { AssignableRoleAssignment, User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidRoleAssignmentInputError } from '../../errors/invalid-role-assignment-input-error'
import type { RoleAssignmentRepository } from '../../repositories/role-assignment-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { AssignRoleUseCase, type AssignRoleUseCaseInput } from './AssignRoleUseCase'

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
    assignRole: vi.fn(async () => {}),
    editRoleAssignmentScope: async () => {},
    removeRoleAssignment: async () => {},
    ...overrides,
  }
}

function validInput(overrides: Partial<AssignRoleUseCaseInput> = {}): AssignRoleUseCaseInput {
  return {
    actorId: 'admin-1',
    userId: 'target-1',
    assignment: { role: 'treasurer' },
    ...overrides,
  }
}

describe('AssignRoleUseCase', () => {
  it('throws ForbiddenError when the actor does not exist', async () => {
    const useCase = new AssignRoleUseCase(fakeUserRepository(null), fakeRoleAssignmentRepository())
    await expect(useCase.execute(validInput())).rejects.toThrow(ForbiddenError)
  })

  // AC-WU-05 — the non-negotiable line, exercised end to end: a
  // non-admin actor (volunteer) is refused regardless of which role they
  // try to assign.
  it('throws ForbiddenError when the actor is not an admin', async () => {
    const useCase = new AssignRoleUseCase(fakeUserRepository(volunteerUser()), fakeRoleAssignmentRepository())
    await expect(useCase.execute(validInput({ actorId: 'volunteer-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws InvalidRoleAssignmentInputError when userId is missing', async () => {
    const useCase = new AssignRoleUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository())
    await expect(useCase.execute(validInput({ userId: '' }))).rejects.toThrow(InvalidRoleAssignmentInputError)
  })

  // AC-WU-35 — the 'player' role requires a team.
  it('throws InvalidRoleAssignmentInputError when the player role has no teamId', async () => {
    const useCase = new AssignRoleUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository())
    const assignment = { role: 'player', teamId: '' } as unknown as AssignableRoleAssignment
    await expect(useCase.execute(validInput({ assignment }))).rejects.toThrow(InvalidRoleAssignmentInputError)
  })

  // AC-WU-35 — the 'coach' role requires at least one team.
  it('throws InvalidRoleAssignmentInputError when the coach role has zero teams', async () => {
    const useCase = new AssignRoleUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository())
    await expect(
      useCase.execute(validInput({ assignment: { role: 'coach', teamIds: [] } })),
    ).rejects.toThrow(InvalidRoleAssignmentInputError)
  })

  // AC-WU-35 — the 'section-manager' role requires a section.
  it('throws InvalidRoleAssignmentInputError when the section-manager role has no sectionId', async () => {
    const useCase = new AssignRoleUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository())
    const assignment = { role: 'section-manager', sectionId: '' } as unknown as AssignableRoleAssignment
    await expect(useCase.execute(validInput({ assignment }))).rejects.toThrow(InvalidRoleAssignmentInputError)
  })

  it('assigns a player to their required team', async () => {
    const assignRole = vi.fn(async () => {})
    const useCase = new AssignRoleUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository({ assignRole }))

    await useCase.execute(validInput({ userId: 'player-1', assignment: { role: 'player', teamId: 'team-1' } }))

    expect(assignRole).toHaveBeenCalledWith('player-1', { role: 'player', teamId: 'team-1' })
  })

  it('assigns a coach to every given team', async () => {
    const assignRole = vi.fn(async () => {})
    const useCase = new AssignRoleUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository({ assignRole }))

    await useCase.execute(validInput({ userId: 'coach-1', assignment: { role: 'coach', teamIds: ['team-1', 'team-2'] } }))

    expect(assignRole).toHaveBeenCalledWith('coach-1', { role: 'coach', teamIds: ['team-1', 'team-2'] })
  })

  it('assigns a section-manager to their required section', async () => {
    const assignRole = vi.fn(async () => {})
    const useCase = new AssignRoleUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository({ assignRole }))

    await useCase.execute(validInput({ userId: 'section-manager-1', assignment: { role: 'section-manager', sectionId: 'section-1' } }))

    expect(assignRole).toHaveBeenCalledWith('section-manager-1', { role: 'section-manager', sectionId: 'section-1' })
  })

  // AC-WU-06 — the four unscoped roles need no scope field at all.
  it.each(['authorized-officer', 'treasurer', 'medical-referent', 'volunteer'] as const)(
    'assigns the unscoped role %s with no scope validation',
    async (role) => {
      const assignRole = vi.fn(async () => {})
      const useCase = new AssignRoleUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository({ assignRole }))

      await useCase.execute(validInput({ userId: 'target-1', assignment: { role } }))

      expect(assignRole).toHaveBeenCalledWith('target-1', { role })
    },
  )

  it('propagates whatever error the repository throws, without swallowing or rewrapping it', async () => {
    class FakeRepositoryError extends Error {}
    const assignRole = vi.fn(async () => {
      throw new FakeRepositoryError('boom')
    })
    const useCase = new AssignRoleUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository({ assignRole }))

    await expect(useCase.execute(validInput())).rejects.toThrow(FakeRepositoryError)
  })
})
