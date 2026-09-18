import { describe, expect, it, vi } from 'vitest'
import type { Membership } from '../../entities/membership'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import type { MembershipRepository } from '../../repositories/membership-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { ArchiveMembershipUseCase } from './ArchiveMembershipUseCase'

function adminUser(): User {
  return { id: 'admin-1', fullName: 'Administrateur', email: 'admin@example.com', roles: [{ role: 'admin' }], position: null, charterAcceptedAt: null }
}

function coachUser(): User {
  return { id: 'coach-1', fullName: 'Coach', email: 'coach@example.com', roles: [{ role: 'coach', teamIds: [] }], position: null, charterAcceptedAt: null }
}

function fakeUserRepository(user: User | null): UserRepository {
  return {
    findById: async () => user,
    acceptCharter: async () => {},
    findAll: async () => [],
  }
}

function archivedMembership(): Membership {
  return { id: 'membership-1', userId: 'user-1', licenceNumber: null, status: 'pending', seasonId: 'season-1', validUntil: '2027-06-30', amountDueCents: null }
}

function fakeMembershipRepository(overrides: Partial<MembershipRepository> = {}): MembershipRepository {
  return {
    findForUserAndSeason: async () => null,
    findAllForAdmin: async () => [],
    findArchivedForUserAndSeason: async () => null,
    create: async () => {
      throw new Error('not implemented')
    },
    update: async () => {
      throw new Error('not implemented')
    },
    replaceArchived: async () => {
      throw new Error('not implemented')
    },
    archive: vi.fn(async (id: string) => ({ ...archivedMembership(), id })),
    countPendingForSeason: async () => 0,
    ...overrides,
  }
}

describe('ArchiveMembershipUseCase', () => {
  it('throws ForbiddenError when the actor does not exist', async () => {
    const useCase = new ArchiveMembershipUseCase(fakeUserRepository(null), fakeMembershipRepository())
    await expect(useCase.execute({ actorId: 'admin-1', membershipId: 'membership-1' })).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when the actor is not admin', async () => {
    const useCase = new ArchiveMembershipUseCase(fakeUserRepository(coachUser()), fakeMembershipRepository())
    await expect(useCase.execute({ actorId: 'coach-1', membershipId: 'membership-1' })).rejects.toThrow(ForbiddenError)
  })

  it('archives the membership, attributing archived_by to the acting admin', async () => {
    const archive = vi.fn(async (id: string) => ({ ...archivedMembership(), id }))
    const useCase = new ArchiveMembershipUseCase(fakeUserRepository(adminUser()), fakeMembershipRepository({ archive }))

    await useCase.execute({ actorId: 'admin-1', membershipId: 'membership-1' })

    expect(archive).toHaveBeenCalledWith('membership-1', 'admin-1')
  })
})
