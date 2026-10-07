import { describe, expect, it, vi } from 'vitest'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceInputError } from '../../errors/invalid-finance-input-error'
import { NotFoundError } from '../../errors/not-found-error'
import { UpdateExpenseUseCase, type UpdateExpenseUseCaseInput } from './UpdateExpenseUseCase'
import { auditRepository, existingAdvance, financeRepository, payerChoices, treasurer, userRepository, userWith } from './finance-test-support'

// Matches existingExpense of finance-test-support.
function input(overrides: Partial<UpdateExpenseUseCaseInput> = {}): UpdateExpenseUseCaseInput {
  return {
    actorId: 'actor-1',
    expenseId: 'expense-1',
    seasonStartDate: '2026-09-01',
    today: '2026-10-06',
    amountCents: 4200,
    label: ' Trousse ',
    spentOn: '2026-10-04',
    categoryId: 'cat-1',
    payer: { kind: 'carrier', carrierId: 'cash-1', paymentMethod: 'cash' },
    payerChoices,
    ...overrides,
  }
}

describe('UpdateExpenseUseCase', () => {
  it('updates in place with a trimmed label', async () => {
    const finance = financeRepository()
    const useCase = new UpdateExpenseUseCase(userRepository(treasurer()), finance, auditRepository())

    await useCase.execute(input())

    expect(finance.updateExpense).toHaveBeenCalledWith('expense-1', {
      amountCents: 4200,
      label: 'Trousse',
      spentOn: '2026-10-04',
      categoryId: 'cat-1',
      payer: { kind: 'carrier', carrierId: 'cash-1', paymentMethod: 'cash' },
    })
  })

  it('emits expense.updated with structured before/after and NEVER the label', async () => {
    const audit = auditRepository()
    const useCase = new UpdateExpenseUseCase(userRepository(treasurer()), financeRepository(), audit)

    await useCase.execute(input({ amountCents: 4200, label: 'Autre libellé secret', payer: { kind: 'carrier', carrierId: 'bank-1', paymentMethod: 'cash' } }))

    expect(audit.record).toHaveBeenCalledTimes(1)
    expect(audit.record).toHaveBeenCalledWith({
      action: 'expense.updated',
      targetId: 'expense-1',
      targetType: 'expense',
      metadata: {
        before: {
          amountCents: 3800,
          spentOn: '2026-10-04',
          categoryId: 'cat-1',
          carrierId: 'cash-1',
          advancedByUserId: null,
          reimbursedOn: null,
          paymentMethod: 'cash',
        },
        after: {
          amountCents: 4200,
          spentOn: '2026-10-04',
          categoryId: 'cat-1',
          carrierId: 'bank-1',
          advancedByUserId: null,
          reimbursedOn: null,
          paymentMethod: 'cash',
        },
        labelChanged: true,
      },
    })
    const serialized = JSON.stringify(vi.mocked(audit.record).mock.calls)
    expect(serialized).not.toContain('Autre libellé secret')
    expect(serialized).not.toContain('Trousse')
  })

  it('flags labelChanged false when only another field changed', async () => {
    const audit = auditRepository()
    const useCase = new UpdateExpenseUseCase(userRepository(treasurer()), financeRepository(), audit)

    await useCase.execute(input())

    expect(vi.mocked(audit.record).mock.calls[0][0].metadata).toMatchObject({ labelChanged: false })
  })

  it('writes nothing and emits no audit entry when nothing changed', async () => {
    const finance = financeRepository()
    const audit = auditRepository()
    const useCase = new UpdateExpenseUseCase(userRepository(treasurer()), finance, audit)

    await expect(useCase.execute(input({ amountCents: 3800 }))).resolves.toMatchObject({ id: 'expense-1' })

    expect(finance.updateExpense).not.toHaveBeenCalled()
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('throws NotFoundError when the expense is gone, without writing', async () => {
    const finance = financeRepository({ findExpense: vi.fn(async () => null) })
    const useCase = new UpdateExpenseUseCase(userRepository(treasurer()), finance, auditRepository())

    await expect(useCase.execute(input())).rejects.toBeInstanceOf(NotFoundError)
    expect(finance.updateExpense).not.toHaveBeenCalled()
  })

  it('still resolves when the audit write fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const audit = auditRepository({ record: vi.fn(async () => Promise.reject(new Error('audit down'))) })
    const useCase = new UpdateExpenseUseCase(userRepository(treasurer()), financeRepository(), audit)

    await expect(useCase.execute(input())).resolves.toMatchObject({ amountCents: 4200 })
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it.each([
    { role: 'authorized-officer' },
    { role: 'admin' },
    { role: 'player', teamId: 'team-1' },
  ] as User['roles'])('refuses %j before any read or write', async (role) => {
    const finance = financeRepository()
    const audit = auditRepository()
    const useCase = new UpdateExpenseUseCase(userRepository(userWith([role])), finance, audit)

    await expect(useCase.execute(input())).rejects.toBeInstanceOf(ForbiddenError)
    expect(finance.findExpense).not.toHaveBeenCalled()
    expect(finance.updateExpense).not.toHaveBeenCalled()
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('refuses an unknown actor', async () => {
    const useCase = new UpdateExpenseUseCase(userRepository(null), financeRepository(), auditRepository())
    await expect(useCase.execute(input())).rejects.toBeInstanceOf(ForbiddenError)
  })

  it.each([
    ['zero amount', { amountCents: 0 }],
    ['fractional cents', { amountCents: 10.5 }],
    ['blank label', { label: '   ' }],
    ['future date', { spentOn: '2026-10-07' }],
    ['date before the season', { spentOn: '2026-08-31' }],
    ['missing category', { categoryId: '' }],
    ['missing carrier', { payer: { kind: 'carrier', carrierId: '', paymentMethod: 'cash' } }],
    ['archived carrier', { payer: { kind: 'carrier', carrierId: 'old-1', paymentMethod: 'cash' } }],
    ['unknown method', { payer: { kind: 'carrier', carrierId: 'cash-1', paymentMethod: 'bitcoin' } }],
    ['unknown member', { payer: { kind: 'member', userId: 'ghost', reimbursement: null } }],
    ['reimbursement before the expense', { payer: { kind: 'member', userId: 'member-1', reimbursement: { reimbursedOn: '2026-10-03', paymentMethod: 'cash' } } }],
    ['missing id', { expenseId: '' }],
  ] as [string, Partial<UpdateExpenseUseCaseInput>][])('rejects %s before any write', async (_name, overrides) => {
    const finance = financeRepository()
    const audit = auditRepository()
    const useCase = new UpdateExpenseUseCase(userRepository(treasurer()), finance, audit)

    await expect(useCase.execute(input(overrides))).rejects.toBeInstanceOf(InvalidFinanceInputError)
    expect(finance.updateExpense).not.toHaveBeenCalled()
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('accepts a date exactly equal to today', async () => {
    const useCase = new UpdateExpenseUseCase(userRepository(treasurer()), financeRepository(), auditRepository())
    await expect(useCase.execute(input({ spentOn: '2026-10-06' }))).resolves.toBeDefined()
  })

  // specs/finances-member-advances.md AC-FA-06.
  describe('payer and reimbursement corrections', () => {
    const advanceInput = (overrides: Partial<UpdateExpenseUseCaseInput> = {}) =>
      input({
        expenseId: 'advance-1',
        amountCents: 5800,
        label: 'Maillots',
        spentOn: '2026-10-02',
        payer: { kind: 'member', userId: 'member-1', reimbursement: null },
        ...overrides,
      })
    const withAdvance = () => financeRepository({ findExpense: vi.fn(async () => existingAdvance) })

    it('writes nothing when an advance is saved unchanged', async () => {
      const finance = withAdvance()
      const audit = auditRepository()
      await new UpdateExpenseUseCase(userRepository(treasurer()), finance, audit).execute(advanceInput())
      expect(finance.updateExpense).not.toHaveBeenCalled()
      expect(audit.record).not.toHaveBeenCalled()
    })

    it('passes from "À rembourser" to "Remboursé" and audits date and method, the member by id only', async () => {
      const finance = withAdvance()
      const audit = auditRepository()
      const payer = { kind: 'member', userId: 'member-1', reimbursement: { reimbursedOn: '2026-10-05', paymentMethod: 'transfer' } } as const

      await new UpdateExpenseUseCase(userRepository(treasurer()), finance, audit).execute(advanceInput({ payer }))

      expect(finance.updateExpense).toHaveBeenCalledWith('advance-1', expect.objectContaining({ payer }))
      const metadata = vi.mocked(audit.record).mock.calls[0][0].metadata as { before: unknown; after: unknown }
      expect(metadata.before).toMatchObject({ advancedByUserId: 'member-1', reimbursedOn: null, paymentMethod: null })
      expect(metadata.after).toMatchObject({ advancedByUserId: 'member-1', reimbursedOn: '2026-10-05', paymentMethod: 'transfer' })
      expect(JSON.stringify(metadata)).not.toContain('Maillots')
    })

    it('counts a change of member, and a switch to a carrier (reimbursement cleared by the type)', async () => {
      const finance = withAdvance()
      const useCase = new UpdateExpenseUseCase(userRepository(treasurer()), finance, auditRepository())

      await useCase.execute(advanceInput({ payer: { kind: 'member', userId: 'member-2', reimbursement: null } }))
      await useCase.execute(advanceInput({ payer: { kind: 'carrier', carrierId: 'bank-1', paymentMethod: 'card' } }))

      expect(finance.updateExpense).toHaveBeenCalledTimes(2)
      expect(finance.updateExpense).toHaveBeenLastCalledWith('advance-1', expect.objectContaining({ payer: { kind: 'carrier', carrierId: 'bank-1', paymentMethod: 'card' } }))
    })

    it('counts a carrier expense turned into an advance', async () => {
      const finance = financeRepository()
      await new UpdateExpenseUseCase(userRepository(treasurer()), finance, auditRepository()).execute(
        input({ amountCents: 3800, payer: { kind: 'member', userId: 'member-1', reimbursement: null } }),
      )
      expect(finance.updateExpense).toHaveBeenCalledTimes(1)
    })
  })
})
