import { describe, expect, it, vi } from 'vitest'
import type { Membership } from '../../entities/membership'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import type { AuditLogRepository, RecordAuditLogEntryInput } from '../../repositories/audit-log-repository'
import type { MembershipRepository } from '../../repositories/membership-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { ArchiveMembershipUseCase } from './ArchiveMembershipUseCase'

function adminUser(): User {
  return { id: 'admin-1', fullName: 'Administrateur', email: 'admin@example.com', roles: [{ role: 'admin' }], position: null, age: null, handedness: null, charterAcceptedAt: null }
}

function coachUser(): User {
  return { id: 'coach-1', fullName: 'Coach', email: 'coach@example.com', roles: [{ role: 'coach', teamIds: [] }], position: null, age: null, handedness: null, charterAcceptedAt: null }
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

function fakeAuditLogRepository(overrides: Partial<AuditLogRepository> = {}): AuditLogRepository {
  return {
    list: async () => ({ entries: [], hasMore: false }),
    record: vi.fn(async (_entry: RecordAuditLogEntryInput) => {}),
    ...overrides,
  }
}

describe('ArchiveMembershipUseCase', () => {
  it('throws ForbiddenError when the actor does not exist', async () => {
    const useCase = new ArchiveMembershipUseCase(fakeUserRepository(null), fakeMembershipRepository(), fakeAuditLogRepository())
    await expect(useCase.execute({ actorId: 'admin-1', membershipId: 'membership-1' })).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when the actor is not admin', async () => {
    const useCase = new ArchiveMembershipUseCase(fakeUserRepository(coachUser()), fakeMembershipRepository(), fakeAuditLogRepository())
    await expect(useCase.execute({ actorId: 'coach-1', membershipId: 'membership-1' })).rejects.toThrow(ForbiddenError)
  })

  it('archives the membership, attributing archived_by to the acting admin', async () => {
    const archive = vi.fn(async (id: string) => ({ ...archivedMembership(), id }))
    const useCase = new ArchiveMembershipUseCase(fakeUserRepository(adminUser()), fakeMembershipRepository({ archive }), fakeAuditLogRepository())

    await useCase.execute({ actorId: 'admin-1', membershipId: 'membership-1' })

    expect(archive).toHaveBeenCalledWith('membership-1', 'admin-1')
  })

  // Follow-up pass to specs/web-audit-logs.md (2026-09-30 fourth addendum) —
  // a successful archive records exactly one 'membership.archived' audit
  // entry, targeted at the membership, after the archive write itself has
  // already committed.
  it('records a membership.archived audit entry once, targeted at the membership', async () => {
    const record = vi.fn(async () => {})
    const useCase = new ArchiveMembershipUseCase(fakeUserRepository(adminUser()), fakeMembershipRepository(), fakeAuditLogRepository({ record }))

    await useCase.execute({ actorId: 'admin-1', membershipId: 'membership-1' })

    expect(record).toHaveBeenCalledTimes(1)
    expect(record).toHaveBeenCalledWith({
      action: 'membership.archived',
      targetId: 'membership-1',
      targetType: 'membership',
      metadata: {},
    })
  })

  // See this use case's own top comment: an audit-write failure must not
  // reject execute()'s own promise — the archive itself already succeeded.
  it('still resolves when the audit write rejects, because the archive itself already succeeded', async () => {
    const record = vi.fn(async () => {
      throw new Error('audit RPC unavailable')
    })
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const useCase = new ArchiveMembershipUseCase(fakeUserRepository(adminUser()), fakeMembershipRepository(), fakeAuditLogRepository({ record }))

    await expect(useCase.execute({ actorId: 'admin-1', membershipId: 'membership-1' })).resolves.toBeDefined()
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
