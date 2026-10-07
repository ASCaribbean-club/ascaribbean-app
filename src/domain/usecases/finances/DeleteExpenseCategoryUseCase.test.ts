import { describe, expect, it, vi } from 'vitest'
import { ExpenseCategoryInUseError } from '../../errors/expense-category-in-use-error'
import { ForbiddenError } from '../../errors/forbidden-error'
import { NotFoundError } from '../../errors/not-found-error'
import { DeleteExpenseCategoryUseCase } from './DeleteExpenseCategoryUseCase'
import { auditRepository, financeRepository, treasurer, userRepository, userWith } from './finance-test-support'

const categories = [{ id: 'cat-1', label: 'Buvette', colorIndex: 0 }]

describe('DeleteExpenseCategoryUseCase', () => {
  it('deletes then emits expense_category.deleted with the label (before only)', async () => {
    const finance = financeRepository({ listCategories: vi.fn(async () => categories) })
    const audit = auditRepository()
    const useCase = new DeleteExpenseCategoryUseCase(userRepository(treasurer()), finance, audit)

    await useCase.execute({ actorId: 'actor-1', categoryId: 'cat-1' })

    expect(finance.deleteExpenseCategory).toHaveBeenCalledWith('cat-1')
    expect(audit.record).toHaveBeenCalledWith({
      action: 'expense_category.deleted',
      targetId: 'cat-1',
      targetType: 'expense_category',
      metadata: { before: { label: 'Buvette' } },
    })
  })

  it('propagates the in-use error (FK backstop) and emits no audit entry', async () => {
    const finance = financeRepository({
      listCategories: vi.fn(async () => categories),
      deleteExpenseCategory: vi.fn(async () => Promise.reject(new ExpenseCategoryInUseError('fk'))),
    })
    const audit = auditRepository()
    const useCase = new DeleteExpenseCategoryUseCase(userRepository(treasurer()), finance, audit)

    await expect(useCase.execute({ actorId: 'actor-1', categoryId: 'cat-1' })).rejects.toBeInstanceOf(ExpenseCategoryInUseError)
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('throws NotFoundError for an unknown category', async () => {
    const finance = financeRepository()
    const useCase = new DeleteExpenseCategoryUseCase(userRepository(treasurer()), finance, auditRepository())
    await expect(useCase.execute({ actorId: 'actor-1', categoryId: 'cat-1' })).rejects.toBeInstanceOf(NotFoundError)
    expect(finance.deleteExpenseCategory).not.toHaveBeenCalled()
  })

  it.each([{ role: 'authorized-officer' }, { role: 'admin' }] as const)('refuses %j', async (role) => {
    const finance = financeRepository()
    const useCase = new DeleteExpenseCategoryUseCase(userRepository(userWith([role])), finance, auditRepository())
    await expect(useCase.execute({ actorId: 'actor-1', categoryId: 'cat-1' })).rejects.toBeInstanceOf(ForbiddenError)
    expect(finance.deleteExpenseCategory).not.toHaveBeenCalled()
  })
})
