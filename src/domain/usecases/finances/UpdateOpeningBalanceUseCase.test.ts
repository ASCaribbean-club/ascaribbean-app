import { describe, expect, it, vi } from 'vitest'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceInputError } from '../../errors/invalid-finance-input-error'
import { NotFoundError } from '../../errors/not-found-error'
import { UpdateOpeningBalanceUseCase } from './UpdateOpeningBalanceUseCase'
import { auditRepository, financeRepository, treasurer, userRepository, userWith } from './finance-test-support'

const base = { actorId: 'actor-1', carrierId: 'cash-1', seasonId: 'season-1', amountCents: 12000 }

describe('UpdateOpeningBalanceUseCase', () => {
  it('updates the existing row and audits carrier, season and amount before/after', async () => {
    const finance = financeRepository()
    const audit = auditRepository()
    const useCase = new UpdateOpeningBalanceUseCase(userRepository(treasurer()), finance, audit)

    await useCase.execute(base)

    expect(finance.updateOpeningBalance).toHaveBeenCalledWith('cash-1', 'season-1', 12000)
    expect(audit.record).toHaveBeenCalledWith({
      action: 'opening_balance.updated',
      targetId: 'ob-1',
      targetType: 'opening_balance',
      metadata: {
        before: { carrierId: 'cash-1', seasonId: 'season-1', amountCents: 10000 },
        after: { carrierId: 'cash-1', seasonId: 'season-1', amountCents: 12000 },
      },
    })
  })

  it('accepts a zero amount', async () => {
    const finance = financeRepository()
    const useCase = new UpdateOpeningBalanceUseCase(userRepository(treasurer()), finance, auditRepository())
    await useCase.execute({ ...base, amountCents: 0 })
    expect(finance.updateOpeningBalance).toHaveBeenCalledWith('cash-1', 'season-1', 0)
  })

  it('writes nothing and emits no audit entry when the amount is unchanged', async () => {
    const finance = financeRepository()
    const audit = auditRepository()
    const useCase = new UpdateOpeningBalanceUseCase(userRepository(treasurer()), finance, audit)

    await useCase.execute({ ...base, amountCents: 10000 })

    expect(finance.updateOpeningBalance).not.toHaveBeenCalled()
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('throws NotFoundError when no balance was entered (a correction never inserts)', async () => {
    const finance = financeRepository({ findOpeningBalance: vi.fn(async () => null) })
    const useCase = new UpdateOpeningBalanceUseCase(userRepository(treasurer()), finance, auditRepository())
    await expect(useCase.execute(base)).rejects.toBeInstanceOf(NotFoundError)
    expect(finance.updateOpeningBalance).not.toHaveBeenCalled()
  })

  it.each([{ amountCents: -1 }, { amountCents: 10.5 }, { carrierId: '' }, { seasonId: '' }])(
    'rejects invalid input %j before any write',
    async (overrides) => {
      const finance = financeRepository()
      const useCase = new UpdateOpeningBalanceUseCase(userRepository(treasurer()), finance, auditRepository())
      await expect(useCase.execute({ ...base, ...overrides })).rejects.toBeInstanceOf(InvalidFinanceInputError)
      expect(finance.updateOpeningBalance).not.toHaveBeenCalled()
    },
  )

  it.each([{ role: 'authorized-officer' }, { role: 'admin' }] as const)('refuses %j', async (role) => {
    const finance = financeRepository()
    const useCase = new UpdateOpeningBalanceUseCase(userRepository(userWith([role])), finance, auditRepository())
    await expect(useCase.execute(base)).rejects.toBeInstanceOf(ForbiddenError)
    expect(finance.updateOpeningBalance).not.toHaveBeenCalled()
  })
})
