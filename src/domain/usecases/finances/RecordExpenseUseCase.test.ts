import { describe, expect, it, vi } from 'vitest'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceInputError } from '../../errors/invalid-finance-input-error'
import { RecordExpenseUseCase, type RecordExpenseUseCaseInput } from './RecordExpenseUseCase'
import { auditRepository, financeRepository, payerChoices, treasurer, userRepository, userWith } from './finance-test-support'

function validInput(overrides: Partial<RecordExpenseUseCaseInput> = {}): RecordExpenseUseCaseInput {
  return {
    actorId: 'actor-1',
    seasonId: 'season-1',
    seasonStartDate: '2026-09-01',
    today: '2026-10-06',
    amountCents: 3800,
    label: '  Trousse  ',
    spentOn: '2026-10-04',
    categoryId: 'cat-1',
    payer: { kind: 'carrier', carrierId: 'cash-1', paymentMethod: 'cash' },
    payerChoices,
    ...overrides,
  }
}

describe('RecordExpenseUseCase', () => {
  it('records the expense with the session user as author and a trimmed label', async () => {
    const finance = financeRepository()
    const useCase = new RecordExpenseUseCase(userRepository(treasurer()), finance, auditRepository())

    await useCase.execute(validInput())

    expect(finance.createExpense).toHaveBeenCalledWith({
      seasonId: 'season-1',
      amountCents: 3800,
      label: 'Trousse',
      spentOn: '2026-10-04',
      categoryId: 'cat-1',
      payer: { kind: 'carrier', carrierId: 'cash-1', paymentMethod: 'cash' },
      recordedBy: 'actor-1',
    })
  })

  it('emits expense.recorded targeting the row, with amount and category but NEVER the label', async () => {
    const audit = auditRepository()
    const useCase = new RecordExpenseUseCase(userRepository(treasurer()), financeRepository(), audit)

    await useCase.execute(validInput())

    expect(audit.record).toHaveBeenCalledWith({
      action: 'expense.recorded',
      targetId: 'expense-1',
      targetType: 'expense',
      metadata: {
        amountCents: 3800,
        categoryId: 'cat-1',
        carrierId: 'cash-1',
        advancedByUserId: null,
        reimbursedOn: null,
        paymentMethod: 'cash',
      },
    })
    expect(JSON.stringify(vi.mocked(audit.record).mock.calls)).not.toContain('Trousse')
  })

  it('still resolves when the audit write fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const audit = auditRepository({ record: vi.fn(async () => Promise.reject(new Error('audit down'))) })
    const useCase = new RecordExpenseUseCase(userRepository(treasurer()), financeRepository(), audit)

    await expect(useCase.execute(validInput())).resolves.toMatchObject({ id: 'expense-1' })
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it.each([
    { role: 'authorized-officer' },
    { role: 'admin' },
    { role: 'player', teamId: 'team-1' },
    { role: 'coach', teamIds: ['team-1'] },
  ] as User['roles'])('refuses %j before any call', async (role) => {
    const finance = financeRepository()
    const audit = auditRepository()
    const useCase = new RecordExpenseUseCase(userRepository(userWith([role])), finance, audit)

    await expect(useCase.execute(validInput())).rejects.toBeInstanceOf(ForbiddenError)
    expect(finance.createExpense).not.toHaveBeenCalled()
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('refuses an unknown actor', async () => {
    const useCase = new RecordExpenseUseCase(userRepository(null), financeRepository(), auditRepository())
    await expect(useCase.execute(validInput())).rejects.toBeInstanceOf(ForbiddenError)
  })

  it.each([
    ['zero amount', { amountCents: 0 }],
    ['negative amount', { amountCents: -100 }],
    ['fractional cents', { amountCents: 10.5 }],
    ['blank label', { label: '   ' }],
    ['future date', { spentOn: '2026-10-07' }],
    ['date before the season', { spentOn: '2026-08-31' }],
    ['missing category', { categoryId: '' }],
    ['missing carrier', { payer: { kind: 'carrier', carrierId: '', paymentMethod: 'cash' } }],
    ['archived or unknown carrier', { payer: { kind: 'carrier', carrierId: 'old-1', paymentMethod: 'cash' } }],
    ['unknown method', { payer: { kind: 'carrier', carrierId: 'cash-1', paymentMethod: 'bitcoin' } }],
    ['unknown member', { payer: { kind: 'member', userId: 'ghost', reimbursement: null } }],
    ['reimbursement before the expense date', { payer: { kind: 'member', userId: 'member-1', reimbursement: { reimbursedOn: '2026-10-03', paymentMethod: 'cash' } } }],
    ['reimbursement in the future', { payer: { kind: 'member', userId: 'member-1', reimbursement: { reimbursedOn: '2026-10-07', paymentMethod: 'cash' } } }],
    ['reimbursement with an unknown method', { payer: { kind: 'member', userId: 'member-1', reimbursement: { reimbursedOn: '2026-10-05', paymentMethod: 'bitcoin' } } }],
  ] as [string, Partial<RecordExpenseUseCaseInput>][])('rejects %s before any write', async (_name, overrides) => {
    const finance = financeRepository()
    const audit = auditRepository()
    const useCase = new RecordExpenseUseCase(userRepository(treasurer()), finance, audit)

    await expect(useCase.execute(validInput(overrides))).rejects.toBeInstanceOf(InvalidFinanceInputError)
    expect(finance.createExpense).not.toHaveBeenCalled()
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('accepts a date exactly equal to today and to the season start', async () => {
    const useCase = new RecordExpenseUseCase(userRepository(treasurer()), financeRepository(), auditRepository())
    await expect(useCase.execute(validInput({ spentOn: '2026-10-06' }))).resolves.toBeDefined()
    await expect(useCase.execute(validInput({ spentOn: '2026-09-01' }))).resolves.toBeDefined()
  })

  it('accepts the cheque and direct debit methods of the expense referential', async () => {
    const useCase = new RecordExpenseUseCase(userRepository(treasurer()), financeRepository(), auditRepository())
    const withMethod = (paymentMethod: 'cheque' | 'direct_debit') =>
      validInput({ payer: { kind: 'carrier', carrierId: 'cash-1', paymentMethod } })
    await expect(useCase.execute(withMethod('cheque'))).resolves.toBeDefined()
    await expect(useCase.execute(withMethod('direct_debit'))).resolves.toBeDefined()
  })

  // specs/finances-member-advances.md AC-FA-05/AC-FA-11.
  describe('advance by a member', () => {
    const toReimburse = { kind: 'member', userId: 'member-1', reimbursement: null } as const

    it('records an advance to reimburse and audits the member by id only, no method, no name, no label', async () => {
      const finance = financeRepository()
      const audit = auditRepository()
      const useCase = new RecordExpenseUseCase(userRepository(treasurer()), finance, audit)

      await useCase.execute(validInput({ payer: toReimburse }))

      expect(finance.createExpense).toHaveBeenCalledWith(expect.objectContaining({ payer: toReimburse }))
      expect(audit.record).toHaveBeenCalledWith({
        action: 'expense.recorded',
        targetId: 'expense-1',
        targetType: 'expense',
        metadata: {
          amountCents: 3800,
          categoryId: 'cat-1',
          carrierId: null,
          advancedByUserId: 'member-1',
          reimbursedOn: null,
          paymentMethod: null,
        },
      })
      expect(JSON.stringify(vi.mocked(audit.record).mock.calls)).not.toContain('Trousse')
    })

    it('records an already reimbursed advance with its date and method', async () => {
      const audit = auditRepository()
      const useCase = new RecordExpenseUseCase(userRepository(treasurer()), financeRepository(), audit)
      const payer = { kind: 'member', userId: 'member-1', reimbursement: { reimbursedOn: '2026-10-06', paymentMethod: 'transfer' } } as const

      await useCase.execute(validInput({ payer }))

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ advancedByUserId: 'member-1', reimbursedOn: '2026-10-06', paymentMethod: 'transfer' }),
        }),
      )
    })

    it('accepts a reimbursement dated exactly the expense date and exactly today', async () => {
      const useCase = new RecordExpenseUseCase(userRepository(treasurer()), financeRepository(), auditRepository())
      const on = (reimbursedOn: string) =>
        validInput({ payer: { kind: 'member', userId: 'member-1', reimbursement: { reimbursedOn, paymentMethod: 'cash' } } })
      await expect(useCase.execute(on('2026-10-04'))).resolves.toBeDefined()
      await expect(useCase.execute(on('2026-10-06'))).resolves.toBeDefined()
    })
  })
})
