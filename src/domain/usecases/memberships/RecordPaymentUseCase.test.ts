import { describe, expect, it, vi } from 'vitest'
import type { Payment } from '../../entities/payment'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidPaymentInputError } from '../../errors/invalid-payment-input-error'
import type { CreatePaymentInput, PaymentRepository } from '../../repositories/payment-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { RecordPaymentUseCase, type RecordPaymentUseCaseInput } from './RecordPaymentUseCase'

function adminUser(): User {
  return { id: 'admin-1', fullName: 'Administrateur', email: 'admin@example.com', roles: [{ role: 'admin' }], position: null, charterAcceptedAt: null }
}

function playerUser(): User {
  return { id: 'player-1', fullName: 'Joueur', email: 'player@example.com', roles: [{ role: 'player', teamId: 'team-1' }], position: null, charterAcceptedAt: null }
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

function fakePaymentRepository(overrides: Partial<PaymentRepository> = {}): PaymentRepository {
  return {
    listForMembership: async () => [],
    findAllForAdmin: async () => [],
    create: vi.fn(async (input: CreatePaymentInput) => ({ id: 'payment-1', recordedAt: '2026-09-17T10:00:00.000Z', ...input }) satisfies Payment),
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
    const useCase = new RecordPaymentUseCase(fakeUserRepository(null), fakePaymentRepository())
    await expect(useCase.execute(validInput())).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when the actor is not admin', async () => {
    const useCase = new RecordPaymentUseCase(fakeUserRepository(playerUser()), fakePaymentRepository())
    await expect(useCase.execute(validInput({ actorId: 'player-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws InvalidPaymentInputError when amountCents is zero', async () => {
    const useCase = new RecordPaymentUseCase(fakeUserRepository(adminUser()), fakePaymentRepository())
    await expect(useCase.execute(validInput({ amountCents: 0 }))).rejects.toThrow(InvalidPaymentInputError)
  })

  it('throws InvalidPaymentInputError when amountCents is negative', async () => {
    const useCase = new RecordPaymentUseCase(fakeUserRepository(adminUser()), fakePaymentRepository())
    await expect(useCase.execute(validInput({ amountCents: -100 }))).rejects.toThrow(InvalidPaymentInputError)
  })

  it('throws InvalidPaymentInputError when amountCents is not an integer', async () => {
    const useCase = new RecordPaymentUseCase(fakeUserRepository(adminUser()), fakePaymentRepository())
    await expect(useCase.execute(validInput({ amountCents: 150.5 }))).rejects.toThrow(InvalidPaymentInputError)
  })

  it('throws InvalidPaymentInputError when paidAt is missing', async () => {
    const useCase = new RecordPaymentUseCase(fakeUserRepository(adminUser()), fakePaymentRepository())
    await expect(useCase.execute(validInput({ paidAt: '' }))).rejects.toThrow(InvalidPaymentInputError)
  })

  it('records the payment, attributing recordedBy to the acting admin', async () => {
    const create = vi.fn(async (input: CreatePaymentInput) => ({ id: 'payment-1', recordedAt: '2026-09-17T10:00:00.000Z', ...input }) satisfies Payment)
    const useCase = new RecordPaymentUseCase(fakeUserRepository(adminUser()), fakePaymentRepository({ create }))

    await useCase.execute(validInput())

    expect(create).toHaveBeenCalledWith({
      membershipId: 'membership-1',
      amountCents: 15000,
      paidAt: '2026-09-17',
      recordedBy: 'admin-1',
    })
  })
})
