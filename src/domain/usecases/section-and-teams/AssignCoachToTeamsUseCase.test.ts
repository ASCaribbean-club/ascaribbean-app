import { describe, expect, it, vi } from 'vitest'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidCoachAssignmentInputError } from '../../errors/invalid-coach-assignment-input-error'
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
  }
}

function fakeRoleAssignmentRepository(overrides: Partial<RoleAssignmentRepository> = {}): RoleAssignmentRepository {
  return {
    assignCoachToTeams: vi.fn(async () => {}),
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
    const useCase = new AssignCoachToTeamsUseCase(fakeUserRepository(null), fakeRoleAssignmentRepository())
    await expect(useCase.execute(validInput())).rejects.toThrow(ForbiddenError)
  })

  // §3/AC-ST-39 — a coach must never be able to self-assign.
  it('throws ForbiddenError when the actor is a coach, not an admin', async () => {
    const useCase = new AssignCoachToTeamsUseCase(fakeUserRepository(coachUser()), fakeRoleAssignmentRepository())
    await expect(useCase.execute(validInput({ actorId: 'coach-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when the actor is a section-manager, not an admin', async () => {
    const useCase = new AssignCoachToTeamsUseCase(fakeUserRepository(sectionManagerUser()), fakeRoleAssignmentRepository())
    await expect(useCase.execute(validInput({ actorId: 'section-manager-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws InvalidCoachAssignmentInputError when userId is missing', async () => {
    const useCase = new AssignCoachToTeamsUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository())
    await expect(useCase.execute(validInput({ userId: '' }))).rejects.toThrow(InvalidCoachAssignmentInputError)
  })

  // §2.10/AC-ST-40 — submitting the dialog with no team checked is rejected
  // from the domain, before any network call.
  it('throws InvalidCoachAssignmentInputError when teamIds is empty', async () => {
    const useCase = new AssignCoachToTeamsUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository())
    await expect(useCase.execute(validInput({ teamIds: [] }))).rejects.toThrow(InvalidCoachAssignmentInputError)
  })

  it('assigns the given userId to every given teamId', async () => {
    const assignCoachToTeams = vi.fn(async () => {})
    const useCase = new AssignCoachToTeamsUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository({ assignCoachToTeams }))

    await useCase.execute(validInput({ userId: 'coach-1', teamIds: ['team-1', 'team-2'] }))

    expect(assignCoachToTeams).toHaveBeenCalledWith('coach-1', ['team-1', 'team-2'])
  })

  it('propagates whatever error the repository throws, without swallowing or rewrapping it', async () => {
    class FakeRepositoryError extends Error {}
    const assignCoachToTeams = vi.fn(async () => {
      throw new FakeRepositoryError('boom')
    })
    const useCase = new AssignCoachToTeamsUseCase(fakeUserRepository(adminUser()), fakeRoleAssignmentRepository({ assignCoachToTeams }))

    await expect(useCase.execute(validInput())).rejects.toThrow(FakeRepositoryError)
  })
})
