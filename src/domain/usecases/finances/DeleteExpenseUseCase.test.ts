import { describe, expect, it, vi } from 'vitest'
import { ForbiddenError } from '../../errors/forbidden-error'
import { NotFoundError } from '../../errors/not-found-error'
import { DeleteExpenseUseCase } from './DeleteExpenseUseCase'
import { auditRepository, financeRepository, treasurer, userRepository, userWith } from './finance-test-support'

describe('DeleteExpenseUseCase', () => {
  it('deletes, then emits expense.deleted with `before` only and never the label', async () => {
    const finance = financeRepository()
    const audit = auditRepository()
    const useCase = new DeleteExpenseUseCase(userRepository(treasurer()), finance, audit)

    await useCase.execute({ actorId: 'actor-1', expenseId: 'expense-1' })

    expect(finance.deleteExpense).toHaveBeenCalledWith('expense-1')
    expect(audit.record).toHaveBeenCalledWith({
      action: 'expense.deleted',
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
      },
    })
    expect(JSON.stringify(vi.mocked(audit.record).mock.calls)).not.toContain('Trousse')
  })

  it('throws NotFoundError without deleting when the expense is gone', async () => {
    const finance = financeRepository({ findExpense: vi.fn(async () => null) })
    const audit = auditRepository()
    const useCase = new DeleteExpenseUseCase(userRepository(treasurer()), finance, audit)

    await expect(useCase.execute({ actorId: 'actor-1', expenseId: 'x' })).rejects.toBeInstanceOf(NotFoundError)
    expect(finance.deleteExpense).not.toHaveBeenCalled()
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('emits no audit entry when the deletion itself fails', async () => {
    const finance = financeRepository({ deleteExpense: vi.fn(async () => Promise.reject(new NotFoundError('gone'))) })
    const audit = auditRepository()
    const useCase = new DeleteExpenseUseCase(userRepository(treasurer()), finance, audit)

    await expect(useCase.execute({ actorId: 'actor-1', expenseId: 'expense-1' })).rejects.toBeInstanceOf(NotFoundError)
    expect(audit.record).not.toHaveBeenCalled()
  })

  it.each([{ role: 'authorized-officer' }, { role: 'admin' }] as const)('refuses %j', async (role) => {
    const finance = financeRepository()
    const useCase = new DeleteExpenseUseCase(userRepository(userWith([role])), finance, auditRepository())

    await expect(useCase.execute({ actorId: 'actor-1', expenseId: 'expense-1' })).rejects.toBeInstanceOf(ForbiddenError)
    expect(finance.deleteExpense).not.toHaveBeenCalled()
  })
})
