import { describe, expect, it, vi } from 'vitest'
import type { Payment } from '../../entities/payment'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidPaymentInputError } from '../../errors/invalid-payment-input-error'
import type { AuditLogRepository, RecordAuditLogEntryInput } from '../../repositories/audit-log-repository'
import type { CreatePaymentInput, PaymentRepository } from '../../repositories/payment-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { RecordPaymentUseCase, type RecordPaymentUseCaseInput } from './RecordPaymentUseCase'

function adminUser(): User {
  return { id: 'admin-1', fullName: 'Administrateur', email: 'admin@example.com', roles: [{ role: 'admin' }], position: null, age: null, handedness: null, charterAcceptedAt: null }
}

function playerUser(): User {
  return { id: 'player-1', fullName: 'Joueur', email: 'player@example.com', roles: [{ role: 'player', teamId: 'team-1' }], position: null, age: null, handedness: null, charterAcceptedAt: null }
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

function fakePaymentRepository(overrides: Partial<PaymentRepository> = {}): PaymentRepository {
  return {
    listForMembership: async () => [],
    findAllForAdmin: async () => [],
    create: vi.fn(async (input: CreatePaymentInput) => ({ id: 'payment-1', recordedAt: '2026-09-17T10:00:00.000Z', ...input }) satisfies Payment),
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

function validInput(overrides: Partial<RecordPaymentUseCaseInput> = {}): RecordPaymentUseCaseInput {
  return {
    actorId: 'admin-1',
    membershipId: 'membership-1',
    amountCents: 15000,
    paidAt: '2026-09-17',
    ...overrides,
  }
}

describe('RecordPaymentUseCase', () => {
  it('throws ForbiddenError when the actor does not exist', async () => {
    const useCase = new RecordPaymentUseCase(fakeUserRepository(null), fakePaymentRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput())).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when the actor is not admin', async () => {
    const useCase = new RecordPaymentUseCase(fakeUserRepository(playerUser()), fakePaymentRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ actorId: 'player-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws InvalidPaymentInputError when amountCents is zero', async () => {
    const useCase = new RecordPaymentUseCase(fakeUserRepository(adminUser()), fakePaymentRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ amountCents: 0 }))).rejects.toThrow(InvalidPaymentInputError)
  })

  it('throws InvalidPaymentInputError when amountCents is negative', async () => {
    const useCase = new RecordPaymentUseCase(fakeUserRepository(adminUser()), fakePaymentRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ amountCents: -100 }))).rejects.toThrow(InvalidPaymentInputError)
  })

  it('throws InvalidPaymentInputError when amountCents is not an integer', async () => {
    const useCase = new RecordPaymentUseCase(fakeUserRepository(adminUser()), fakePaymentRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ amountCents: 150.5 }))).rejects.toThrow(InvalidPaymentInputError)
  })

  it('throws InvalidPaymentInputError when paidAt is missing', async () => {
    const useCase = new RecordPaymentUseCase(fakeUserRepository(adminUser()), fakePaymentRepository(), fakeAuditLogRepository())
    await expect(useCase.execute(validInput({ paidAt: '' }))).rejects.toThrow(InvalidPaymentInputError)
  })

  it('records the payment, attributing recordedBy to the acting admin', async () => {
    const create = vi.fn(async (input: CreatePaymentInput) => ({ id: 'payment-1', recordedAt: '2026-09-17T10:00:00.000Z', ...input }) satisfies Payment)
    const useCase = new RecordPaymentUseCase(fakeUserRepository(adminUser()), fakePaymentRepository({ create }), fakeAuditLogRepository())

    await useCase.execute(validInput())

    expect(create).toHaveBeenCalledWith({
      membershipId: 'membership-1',
      amountCents: 15000,
      paidAt: '2026-09-17',
      paymentMethod: null,
      recordedBy: 'admin-1',
    })
  })

  it('persists the payment method when one is given', async () => {
    const create = vi.fn(async (input: CreatePaymentInput) => ({ id: 'payment-1', recordedAt: '2026-09-17T10:00:00.000Z', ...input }) satisfies Payment)
    const useCase = new RecordPaymentUseCase(fakeUserRepository(adminUser()), fakePaymentRepository({ create }), fakeAuditLogRepository())

    await useCase.execute(validInput({ paymentMethod: 'transfer' }))

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ paymentMethod: 'transfer' }))
  })

  it('throws InvalidPaymentInputError for an unknown payment method, before any write', async () => {
    const create = vi.fn()
    const useCase = new RecordPaymentUseCase(fakeUserRepository(adminUser()), fakePaymentRepository({ create }), fakeAuditLogRepository())

    await expect(useCase.execute(validInput({ paymentMethod: 'cheque' as never }))).rejects.toThrow(InvalidPaymentInputError)
    expect(create).not.toHaveBeenCalled()
  })

  // Follow-up pass to specs/web-audit-logs.md (2026-09-30 fourth addendum) —
  // a successful payment records exactly one 'membership.payment_recorded'
  // audit entry, targeted at the membership, after the payment write itself
  // has already committed.
  it('records a membership.payment_recorded audit entry once, targeted at the membership', async () => {
    const record = vi.fn(async () => {})
    const useCase = new RecordPaymentUseCase(fakeUserRepository(adminUser()), fakePaymentRepository(), fakeAuditLogRepository({ record }))

    await useCase.execute(validInput())

    expect(record).toHaveBeenCalledTimes(1)
    expect(record).toHaveBeenCalledWith({
      action: 'membership.payment_recorded',
      targetId: 'membership-1',
      targetType: 'membership',
      metadata: { amountCents: 15000, paidAt: '2026-09-17' },
    })
  })

  // See this use case's own top comment: an audit-write failure must not
  // reject execute()'s own promise — the payment itself already succeeded.
  it('still resolves when the audit write rejects, because the payment itself already succeeded', async () => {
    const record = vi.fn(async () => {
      throw new Error('audit RPC unavailable')
    })
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const useCase = new RecordPaymentUseCase(fakeUserRepository(adminUser()), fakePaymentRepository(), fakeAuditLogRepository({ record }))

    await expect(useCase.execute(validInput())).resolves.toBeDefined()
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
