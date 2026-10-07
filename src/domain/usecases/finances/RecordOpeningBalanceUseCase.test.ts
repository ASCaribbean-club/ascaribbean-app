import { describe, expect, it, vi } from 'vitest'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceInputError } from '../../errors/invalid-finance-input-error'
import { RecordOpeningBalanceUseCase } from './RecordOpeningBalanceUseCase'
import { auditRepository, financeRepository, treasurer, userRepository, userWith } from './finance-test-support'

const input = { actorId: 'actor-1', carrierId: 'bank-1', seasonId: 'season-1', amountCents: 423400 }

describe('RecordOpeningBalanceUseCase', () => {
  it('records the balance with the session user as author and audits it with carrier and amount', async () => {
    const finance = financeRepository()
    const audit = auditRepository()
    const useCase = new RecordOpeningBalanceUseCase(userRepository(treasurer()), finance, audit)

    await useCase.execute(input)

    expect(finance.createOpeningBalance).toHaveBeenCalledWith({ carrierId: 'bank-1', seasonId: 'season-1', amountCents: 423400, recordedBy: 'actor-1' })
    expect(audit.record).toHaveBeenCalledWith({
      action: 'opening_balance.recorded',
      targetId: 'ob-1',
      targetType: 'opening_balance',
      metadata: { carrierId: 'bank-1', amountCents: 423400 },
    })
  })

  it('accepts an opening balance of exactly 0', async () => {
    const useCase = new RecordOpeningBalanceUseCase(userRepository(treasurer()), financeRepository(), auditRepository())
    await expect(useCase.execute({ ...input, amountCents: 0 })).resolves.toBeDefined()
  })

  it.each([[-1], [10.5]])('rejects %s cents', async (amountCents) => {
    const finance = financeRepository()
    const useCase = new RecordOpeningBalanceUseCase(userRepository(treasurer()), finance, auditRepository())
    await expect(useCase.execute({ ...input, amountCents })).rejects.toBeInstanceOf(InvalidFinanceInputError)
    expect(finance.createOpeningBalance).not.toHaveBeenCalled()
  })

  it.each([[{ role: 'authorized-officer' }], [{ role: 'admin' }]] as const)('refuses %j before any call', async (role) => {
    const finance = financeRepository()
    const audit = auditRepository()
    const useCase = new RecordOpeningBalanceUseCase(userRepository(userWith([role])), finance, audit)

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(ForbiddenError)
    expect(finance.createOpeningBalance).not.toHaveBeenCalled()
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('propagates a repository failure (duplicate) without auditing', async () => {
    const audit = auditRepository()
    const finance = financeRepository({ createOpeningBalance: vi.fn(async () => Promise.reject(new Error('duplicate'))) })
    const useCase = new RecordOpeningBalanceUseCase(userRepository(treasurer()), finance, audit)

    await expect(useCase.execute(input)).rejects.toThrow('duplicate')
    expect(audit.record).not.toHaveBeenCalled()
  })
})
