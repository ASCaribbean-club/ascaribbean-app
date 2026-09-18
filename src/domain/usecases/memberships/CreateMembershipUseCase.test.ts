import { describe, expect, it, vi } from 'vitest'
import type { Membership } from '../../entities/membership'
import type { Payment } from '../../entities/payment'
import type { User } from '../../entities/user'
import { ArchivedMembershipHasPaymentsError } from '../../errors/archived-membership-has-payments-error'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidMembershipInputError } from '../../errors/invalid-membership-input-error'
import { MembershipActivationRequirementsNotMetError } from '../../errors/membership-activation-requirements-error'
import type { CreateMembershipInput, MembershipRepository } from '../../repositories/membership-repository'
import type { PaymentRepository } from '../../repositories/payment-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { CreateMembershipUseCase, type CreateMembershipUseCaseInput } from './CreateMembershipUseCase'

function adminUser(): User {
  return { id: 'admin-1', fullName: 'Administrateur', email: 'admin@example.com', roles: [{ role: 'admin' }], position: null, charterAcceptedAt: null }
}

function treasurerUser(): User {
  return { id: 'treasurer-1', fullName: 'Trésorier', email: 'treasurer@example.com', roles: [{ role: 'treasurer' }], position: null, charterAcceptedAt: null }
}

function fakeUserRepository(user: User | null): UserRepository {
  return {
    findById: async () => user,
    acceptCharter: async () => {},
    findAll: async () => [],
  }
}

function membership(overrides: Partial<Membership> = {}): Membership {
  return {
    id: 'membership-1',
    userId: 'user-1',
    licenceNumber: null,
    status: 'pending',
    seasonId: 'season-1',
    validUntil: '2027-06-30',
    amountDueCents: null,
    ...overrides,
  }
}

function fakeMembershipRepository(overrides: Partial<MembershipRepository> = {}): MembershipRepository {
  return {
    findForUserAndSeason: async () => null,
    findAllForAdmin: async () => [],
    findArchivedForUserAndSeason: async () => null,
    create: vi.fn(async (input: CreateMembershipInput) => ({ id: 'membership-1', ...input }) satisfies Membership),
    update: async () => {
      throw new Error('not implemented')
    },
    replaceArchived: vi.fn(async (id: string, input: CreateMembershipInput) => ({ id, ...input }) satisfies Membership),
    archive: async () => {
      throw new Error('not implemented')
    },
    countPendingForSeason: async () => 0,
    ...overrides,
  }
}

function fakePaymentRepository(overrides: Partial<PaymentRepository> = {}): PaymentRepository {
  return {
    listForMembership: async () => [],
    findAllForAdmin: async () => [],
    create: async () => {
      throw new Error('not implemented')
    },
    ...overrides,
  }
}

function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'payment-1',
    membershipId: 'membership-archived-1',
    amountCents: 15000,
    paidAt: '2026-09-01',
    recordedBy: 'admin-1',
    recordedAt: '2026-09-01T10:00:00.000Z',
    ...overrides,
  }
}

function validInput(overrides: Partial<CreateMembershipUseCaseInput> = {}): CreateMembershipUseCaseInput {
  return {
    actorId: 'admin-1',
    userId: 'user-1',
    seasonId: 'season-1',
    licenceNumber: null,
    status: 'pending',
    validUntil: '2027-06-30',
    ...overrides,
  }
}

describe('CreateMembershipUseCase', () => {
  it('throws ForbiddenError when the actor does not exist', async () => {
    const useCase = new CreateMembershipUseCase(fakeUserRepository(null), fakeMembershipRepository(), fakePaymentRepository())
    await expect(useCase.execute(validInput())).rejects.toThrow(ForbiddenError)
  })

  // §3 — 'admin' only in this pass; a treasurer must not be granted this
  // write, even though the CDC names them for the "cotisation" side (§3,
  // "position retenue... un pis-aller assumé").
  it('throws ForbiddenError when the actor is a treasurer, not an admin', async () => {
    const useCase = new CreateMembershipUseCase(fakeUserRepository(treasurerUser()), fakeMembershipRepository(), fakePaymentRepository())
    await expect(useCase.execute(validInput({ actorId: 'treasurer-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws InvalidMembershipInputError when userId is missing', async () => {
    const useCase = new CreateMembershipUseCase(fakeUserRepository(adminUser()), fakeMembershipRepository(), fakePaymentRepository())
    await expect(useCase.execute(validInput({ userId: '' }))).rejects.toThrow(InvalidMembershipInputError)
  })

  it('throws InvalidMembershipInputError when seasonId is missing', async () => {
    const useCase = new CreateMembershipUseCase(fakeUserRepository(adminUser()), fakeMembershipRepository(), fakePaymentRepository())
    await expect(useCase.execute(validInput({ seasonId: '' }))).rejects.toThrow(InvalidMembershipInputError)
  })

  it('throws InvalidMembershipInputError when status is missing', async () => {
    const useCase = new CreateMembershipUseCase(fakeUserRepository(adminUser()), fakeMembershipRepository(), fakePaymentRepository())
    await expect(useCase.execute(validInput({ status: '' as unknown as Membership['status'] }))).rejects.toThrow(InvalidMembershipInputError)
  })

  it('throws InvalidMembershipInputError when validUntil is missing', async () => {
    const useCase = new CreateMembershipUseCase(fakeUserRepository(adminUser()), fakeMembershipRepository(), fakePaymentRepository())
    await expect(useCase.execute(validInput({ validUntil: '' }))).rejects.toThrow(InvalidMembershipInputError)
  })

  // AC-WM-15 — an empty licence number is a VALID case (mockup row 1), never
  // rejected by the domain.
  it('accepts a null licenceNumber', async () => {
    const create = vi.fn(async (input: CreateMembershipInput) => ({ id: 'membership-1', ...input }) satisfies Membership)
    const useCase = new CreateMembershipUseCase(fakeUserRepository(adminUser()), fakeMembershipRepository({ create }), fakePaymentRepository())

    await useCase.execute(validInput({ licenceNumber: null }))

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ licenceNumber: null }))
  })

  // §2.1/AC-WM-34 — the "Nouvelle adhésion" dialog never carries a
  // "Cotisation totale (€)" field: every created membership starts with
  // amountDueCents === null, never guessed at.
  it('always creates a membership with amountDueCents null, regardless of input', async () => {
    const create = vi.fn(async (input: CreateMembershipInput) => ({ id: 'membership-1', ...input }) satisfies Membership)
    const useCase = new CreateMembershipUseCase(fakeUserRepository(adminUser()), fakeMembershipRepository({ create }), fakePaymentRepository())

    await useCase.execute(validInput())

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ amountDueCents: null }))
  })

  // §2.4/AC-WM-35 (amendement du 2026-09-17) — a brand-new membership can
  // never satisfy the activation rule (amountDueCents is always null and no
  // payment can exist yet), so requesting 'active' at creation is always
  // rejected from the domain, before any network call.
  it('throws MembershipActivationRequirementsNotMetError when status "active" is requested at creation', async () => {
    const create = vi.fn()
    const useCase = new CreateMembershipUseCase(fakeUserRepository(adminUser()), fakeMembershipRepository({ create }), fakePaymentRepository())

    await expect(useCase.execute(validInput({ status: 'active', licenceNumber: 'FR-12345' }))).rejects.toThrow(
      MembershipActivationRequirementsNotMetError,
    )
    expect(create).not.toHaveBeenCalled()
  })

  // §2.4 — the rule constrains ONLY the transition to 'active'; 'pending'
  // and 'suspended' remain free of licence/cotisation requirements.
  it('accepts status "pending" with no licence and no amount due', async () => {
    const create = vi.fn(async (input: CreateMembershipInput) => ({ id: 'membership-1', ...input }) satisfies Membership)
    const useCase = new CreateMembershipUseCase(fakeUserRepository(adminUser()), fakeMembershipRepository({ create }), fakePaymentRepository())

    await useCase.execute(validInput({ status: 'pending', licenceNumber: null }))

    expect(create).toHaveBeenCalledOnce()
  })

  it('creates a plain membership when no archived row exists for this (user, season) pair', async () => {
    const create = vi.fn(async (input: CreateMembershipInput) => ({ id: 'membership-1', ...input }) satisfies Membership)
    const findArchivedForUserAndSeason = vi.fn(async () => null)
    const useCase = new CreateMembershipUseCase(
      fakeUserRepository(adminUser()),
      fakeMembershipRepository({ create, findArchivedForUserAndSeason }),
      fakePaymentRepository(),
    )

    await useCase.execute(validInput())

    expect(findArchivedForUserAndSeason).toHaveBeenCalledWith('user-1', 'season-1')
    expect(create).toHaveBeenCalledOnce()
  })

  // §2.7/PO-WM-03 — the ONE implemented reading of "remplacer": no payments
  // attached, so the archived row is desarchived and overwritten in place.
  it('replaces an archived membership with no payments attached (R1)', async () => {
    const archived = membership({ id: 'membership-archived-1', status: 'suspended' })
    const replaceArchived = vi.fn(async (id: string, input: CreateMembershipInput) => ({ id, ...input }) satisfies Membership)
    const create = vi.fn(async () => {
      throw new Error('should not be called — a replace must happen instead')
    })
    const useCase = new CreateMembershipUseCase(
      fakeUserRepository(adminUser()),
      fakeMembershipRepository({
        findArchivedForUserAndSeason: async () => archived,
        replaceArchived,
        create,
      }),
      fakePaymentRepository({ listForMembership: async () => [] }),
    )

    const result = await useCase.execute(validInput())

    expect(replaceArchived).toHaveBeenCalledWith('membership-archived-1', expect.objectContaining({ userId: 'user-1', seasonId: 'season-1' }))
    expect(create).not.toHaveBeenCalled()
    expect(result.id).toBe('membership-archived-1')
  })

  // §2.7/PO-WM-03 — genuinely blocking: an archived row WITH payments is
  // left unimplemented, flagged with a dedicated error rather than guessed.
  it('throws ArchivedMembershipHasPaymentsError when the archived row already carries payments', async () => {
    const archived = membership({ id: 'membership-archived-1' })
    const replaceArchived = vi.fn()
    const create = vi.fn()
    const useCase = new CreateMembershipUseCase(
      fakeUserRepository(adminUser()),
      fakeMembershipRepository({
        findArchivedForUserAndSeason: async () => archived,
        replaceArchived,
        create,
      }),
      fakePaymentRepository({ listForMembership: async () => [payment()] }),
    )

    await expect(useCase.execute(validInput())).rejects.toThrow(ArchivedMembershipHasPaymentsError)
    expect(replaceArchived).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  // §2.4/AC-WM-07 — a genuine duplicate (two LIVE rows) is left entirely to
  // the database's partial unique index; this use case never pre-checks it.
  it('propagates whatever error the repository throws on create (e.g. a duplicate), without swallowing or rewrapping it', async () => {
    class FakeDuplicateError extends Error {}
    const create = vi.fn(async () => {
      throw new FakeDuplicateError('duplicate')
    })
    const useCase = new CreateMembershipUseCase(fakeUserRepository(adminUser()), fakeMembershipRepository({ create }), fakePaymentRepository())

    await expect(useCase.execute(validInput())).rejects.toThrow(FakeDuplicateError)
  })
})
