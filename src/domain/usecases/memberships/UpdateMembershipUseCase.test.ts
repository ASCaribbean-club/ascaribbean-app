import { describe, expect, it, vi } from 'vitest'
import type { Membership } from '../../entities/membership'
import type { Payment } from '../../entities/payment'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidMembershipInputError } from '../../errors/invalid-membership-input-error'
import { MembershipActivationRequirementsNotMetError } from '../../errors/membership-activation-requirements-error'
import type { MembershipRepository, UpdateMembershipInput } from '../../repositories/membership-repository'
import type { PaymentRepository } from '../../repositories/payment-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { UpdateMembershipUseCase, type UpdateMembershipUseCaseInput } from './UpdateMembershipUseCase'

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
    // specs/web-users.md §2.10 — added by that feature to UserRepository,
    // unrelated to this test's own assertions; stubbed so the fake keeps
    // satisfying the interface.
    findAdminDirectory: async () => [],
    findMissingElementFacts: async () => [],
    updateFullName: async () => {},
    invite: async () => {},
  }
}

function fakeMembershipRepository(overrides: Partial<MembershipRepository> = {}): MembershipRepository {
  return {
    findForUserAndSeason: async () => null,
    findAllForAdmin: async () => [],
    findArchivedForUserAndSeason: async () => null,
    create: async () => {
      throw new Error('not implemented')
    },
    update: vi.fn(async (id: string, input: UpdateMembershipInput) => ({ id, ...input }) satisfies Membership),
    replaceArchived: async () => {
      throw new Error('not implemented')
    },
    archive: async () => {
      throw new Error('not implemented')
    },
    countPendingForSeason: async () => 0,
    ...overrides,
  }
}

function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'payment-1',
    membershipId: 'membership-1',
    amountCents: 30000,
    paidAt: '2026-09-01',
    recordedBy: 'admin-1',
    recordedAt: '2026-09-01T10:00:00.000Z',
    ...overrides,
  }
}

// Default: a fully-settled history (matches validInput's default amountDueCents
// of 30000 below), so tests that don't care about AC-WM-35 aren't forced to
// think about it.
function fakePaymentRepository(overrides: Partial<PaymentRepository> = {}): PaymentRepository {
  return {
    listForMembership: async () => [payment()],
    findAllForAdmin: async () => [],
    create: async () => {
      throw new Error('not implemented')
    },
    ...overrides,
  }
}

function validInput(overrides: Partial<UpdateMembershipUseCaseInput> = {}): UpdateMembershipUseCaseInput {
  return {
    actorId: 'admin-1',
    membershipId: 'membership-1',
    userId: 'user-1',
    seasonId: 'season-1',
    licenceNumber: 'FR-12345',
    status: 'active',
    validUntil: '2027-06-30',
    amountDueCents: 30000,
    ...overrides,
  }
}

describe('UpdateMembershipUseCase', () => {
  it('throws ForbiddenError when the actor does not exist', async () => {
    const useCase = new UpdateMembershipUseCase(fakeUserRepository(null), fakeMembershipRepository(), fakePaymentRepository())
    await expect(useCase.execute(validInput())).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when the actor is not admin', async () => {
    const useCase = new UpdateMembershipUseCase(fakeUserRepository(coachUser()), fakeMembershipRepository(), fakePaymentRepository())
    await expect(useCase.execute(validInput({ actorId: 'coach-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws InvalidMembershipInputError when validUntil is missing', async () => {
    const useCase = new UpdateMembershipUseCase(fakeUserRepository(adminUser()), fakeMembershipRepository(), fakePaymentRepository())
    await expect(useCase.execute(validInput({ validUntil: '' }))).rejects.toThrow(InvalidMembershipInputError)
  })

  it('accepts a null licenceNumber when status stays "pending"', async () => {
    const update = vi.fn(async (id: string, input: UpdateMembershipInput) => ({ id, ...input }) satisfies Membership)
    const useCase = new UpdateMembershipUseCase(fakeUserRepository(adminUser()), fakeMembershipRepository({ update }), fakePaymentRepository())

    await useCase.execute(validInput({ licenceNumber: null, status: 'pending' }))

    expect(update).toHaveBeenCalledWith('membership-1', expect.objectContaining({ licenceNumber: null }))
  })

  it('updates the SAME row (targets membershipId, never inserts a new one)', async () => {
    const update = vi.fn(async (id: string, input: UpdateMembershipInput) => ({ id, ...input }) satisfies Membership)
    const useCase = new UpdateMembershipUseCase(fakeUserRepository(adminUser()), fakeMembershipRepository({ update }), fakePaymentRepository())

    const result = await useCase.execute(validInput())

    expect(update).toHaveBeenCalledOnce()
    expect(result.id).toBe('membership-1')
  })

  it('writes amountDueCents through to the repository, converted upstream to cents already', async () => {
    const update = vi.fn(async (id: string, input: UpdateMembershipInput) => ({ id, ...input }) satisfies Membership)
    const useCase = new UpdateMembershipUseCase(fakeUserRepository(adminUser()), fakeMembershipRepository({ update }), fakePaymentRepository())

    await useCase.execute(validInput({ amountDueCents: 45000, status: 'pending' }))

    expect(update).toHaveBeenCalledWith('membership-1', expect.objectContaining({ amountDueCents: 45000 }))
  })

  it('accepts a null amountDueCents (clearing a previously-set amount)', async () => {
    const update = vi.fn(async (id: string, input: UpdateMembershipInput) => ({ id, ...input }) satisfies Membership)
    const useCase = new UpdateMembershipUseCase(fakeUserRepository(adminUser()), fakeMembershipRepository({ update }), fakePaymentRepository())

    await useCase.execute(validInput({ amountDueCents: null, status: 'pending' }))

    expect(update).toHaveBeenCalledWith('membership-1', expect.objectContaining({ amountDueCents: null }))
  })

  it('throws InvalidMembershipInputError when amountDueCents is negative', async () => {
    const useCase = new UpdateMembershipUseCase(fakeUserRepository(adminUser()), fakeMembershipRepository(), fakePaymentRepository())
    await expect(useCase.execute(validInput({ amountDueCents: -1, status: 'pending' }))).rejects.toThrow(InvalidMembershipInputError)
  })

  it('throws InvalidMembershipInputError when amountDueCents is not an integer', async () => {
    const useCase = new UpdateMembershipUseCase(fakeUserRepository(adminUser()), fakeMembershipRepository(), fakePaymentRepository())
    await expect(useCase.execute(validInput({ amountDueCents: 150.5, status: 'pending' }))).rejects.toThrow(InvalidMembershipInputError)
  })

  // specs/web-memberships.md §2.4/AC-WM-35 (amendement du 2026-09-17) —
  // rejection cases, per the task's own enumeration.
  describe('activation rule (AC-WM-35)', () => {
    it('rejects "active" when licenceNumber is missing', async () => {
      const update = vi.fn()
      const useCase = new UpdateMembershipUseCase(fakeUserRepository(adminUser()), fakeMembershipRepository({ update }), fakePaymentRepository())

      await expect(useCase.execute(validInput({ licenceNumber: null }))).rejects.toThrow(MembershipActivationRequirementsNotMetError)
      expect(update).not.toHaveBeenCalled()
    })

    it('rejects "active" when licenceNumber is blank (only whitespace)', async () => {
      const update = vi.fn()
      const useCase = new UpdateMembershipUseCase(fakeUserRepository(adminUser()), fakeMembershipRepository({ update }), fakePaymentRepository())

      await expect(useCase.execute(validInput({ licenceNumber: '   ' }))).rejects.toThrow(MembershipActivationRequirementsNotMetError)
      expect(update).not.toHaveBeenCalled()
    })

    it('rejects "active" when the cotisation is only partially paid', async () => {
      const update = vi.fn()
      const useCase = new UpdateMembershipUseCase(
        fakeUserRepository(adminUser()),
        fakeMembershipRepository({ update }),
        fakePaymentRepository({ listForMembership: async () => [payment({ amountCents: 15000 })] }),
      )

      await expect(useCase.execute(validInput({ amountDueCents: 30000 }))).rejects.toThrow(MembershipActivationRequirementsNotMetError)
      expect(update).not.toHaveBeenCalled()
    })

    it('rejects "active" when zero payments have been recorded', async () => {
      const update = vi.fn()
      const useCase = new UpdateMembershipUseCase(
        fakeUserRepository(adminUser()),
        fakeMembershipRepository({ update }),
        fakePaymentRepository({ listForMembership: async () => [] }),
      )

      await expect(useCase.execute(validInput({ amountDueCents: 30000 }))).rejects.toThrow(MembershipActivationRequirementsNotMetError)
      expect(update).not.toHaveBeenCalled()
    })

    it('accepts "active" when licenceNumber is set and the cotisation is exactly fully paid', async () => {
      const update = vi.fn(async (id: string, input: UpdateMembershipInput) => ({ id, ...input }) satisfies Membership)
      const useCase = new UpdateMembershipUseCase(
        fakeUserRepository(adminUser()),
        fakeMembershipRepository({ update }),
        fakePaymentRepository({ listForMembership: async () => [payment({ amountCents: 30000 })] }),
      )

      const result = await useCase.execute(validInput({ amountDueCents: 30000 }))

      expect(update).toHaveBeenCalledOnce()
      expect(result.status).toBe('active')
    })

    // §2.4 — the rule constrains ONLY the transition to 'active'.
    it('accepts "pending" and "suspended" with no licence and no payments', async () => {
      const update = vi.fn(async (id: string, input: UpdateMembershipInput) => ({ id, ...input }) satisfies Membership)
      const useCase = new UpdateMembershipUseCase(
        fakeUserRepository(adminUser()),
        fakeMembershipRepository({ update }),
        fakePaymentRepository({ listForMembership: async () => [] }),
      )

      await useCase.execute(validInput({ status: 'pending', licenceNumber: null, amountDueCents: null }))
      await useCase.execute(validInput({ status: 'suspended', licenceNumber: null, amountDueCents: null }))

      expect(update).toHaveBeenCalledTimes(2)
    })

    // §2.4 — "aucune rétrogradation automatique n'est introduite": this use
    // case never READS the membership's previous status to decide whether
    // to downgrade it; it only ever validates the NEW status being written.
    // There is nothing to assert on a "downgrade" here because none exists
    // — this test documents that absence rather than a positive behaviour.
    it('never reads the membership repository to check the PREVIOUS status before writing', async () => {
      const findForUserAndSeason = vi.fn()
      const findAllForAdmin = vi.fn()
      const update = vi.fn(async (id: string, input: UpdateMembershipInput) => ({ id, ...input }) satisfies Membership)
      const useCase = new UpdateMembershipUseCase(
        fakeUserRepository(adminUser()),
        fakeMembershipRepository({ update, findForUserAndSeason, findAllForAdmin }),
        fakePaymentRepository({ listForMembership: async () => [payment({ amountCents: 30000 })] }),
      )

      await useCase.execute(validInput({ amountDueCents: 30000 }))

      expect(findForUserAndSeason).not.toHaveBeenCalled()
      expect(findAllForAdmin).not.toHaveBeenCalled()
    })
  })
})
