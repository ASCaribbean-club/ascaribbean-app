import { describe, expect, it, vi } from 'vitest'
import { DuplicateExpenseCategoryError } from '../../errors/duplicate-expense-category-error'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceInputError } from '../../errors/invalid-finance-input-error'
import { NotFoundError } from '../../errors/not-found-error'
import { RenameExpenseCategoryUseCase } from './RenameExpenseCategoryUseCase'
import { auditRepository, financeRepository, treasurer, userRepository, userWith } from './finance-test-support'

const categories = [
  { id: 'cat-1', label: 'Équipement', colorIndex: 0 },
  { id: 'cat-2', label: 'Buvette', colorIndex: 1 },
]

function setup(overrides = {}) {
  const finance = financeRepository({ listCategories: vi.fn(async () => categories), ...overrides })
  const audit = auditRepository()
  return { finance, audit, useCase: new RenameExpenseCategoryUseCase(userRepository(treasurer()), finance, audit) }
}

describe('RenameExpenseCategoryUseCase', () => {
  it('renames with a normalized label and audits the label before/after', async () => {
    const { finance, audit, useCase } = setup()

    await useCase.execute({ actorId: 'actor-1', categoryId: 'cat-1', label: '  Matériel   sportif ' })

    expect(finance.renameExpenseCategory).toHaveBeenCalledWith('cat-1', 'Matériel sportif')
    expect(audit.record).toHaveBeenCalledWith({
      action: 'expense_category.updated',
      targetId: 'cat-1',
      targetType: 'expense_category',
      metadata: { before: { label: 'Équipement' }, after: { label: 'Matériel sportif' } },
    })
  })

  it('accepts renaming a category to itself with another casing', async () => {
    const { finance, useCase } = setup()
    await useCase.execute({ actorId: 'actor-1', categoryId: 'cat-1', label: 'ÉQUIPEMENT' })
    expect(finance.renameExpenseCategory).toHaveBeenCalledWith('cat-1', 'ÉQUIPEMENT')
  })

  it('refuses a duplicate of another category before any write', async () => {
    const { finance, audit, useCase } = setup()

    await expect(useCase.execute({ actorId: 'actor-1', categoryId: 'cat-1', label: 'buvette' })).rejects.toBeInstanceOf(
      DuplicateExpenseCategoryError,
    )
    expect(finance.renameExpenseCategory).not.toHaveBeenCalled()
    expect(audit.record).not.toHaveBeenCalled()
  })

  it.each(['   ', 'x'.repeat(41)])('refuses an invalid label %j', async (label) => {
    const { finance, useCase } = setup()
    await expect(useCase.execute({ actorId: 'actor-1', categoryId: 'cat-1', label })).rejects.toBeInstanceOf(InvalidFinanceInputError)
    expect(finance.renameExpenseCategory).not.toHaveBeenCalled()
  })

  it('writes nothing and emits no audit entry when the label is unchanged', async () => {
    const { finance, audit, useCase } = setup()
    await useCase.execute({ actorId: 'actor-1', categoryId: 'cat-1', label: ' Équipement ' })
    expect(finance.renameExpenseCategory).not.toHaveBeenCalled()
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('throws NotFoundError for an unknown category', async () => {
    const { useCase } = setup()
    await expect(useCase.execute({ actorId: 'actor-1', categoryId: 'nope', label: 'Autre' })).rejects.toBeInstanceOf(NotFoundError)
  })

  it('refuses a non-treasurer', async () => {
    const finance = financeRepository()
    const useCase = new RenameExpenseCategoryUseCase(userRepository(userWith([{ role: 'admin' }])), finance, auditRepository())
    await expect(useCase.execute({ actorId: 'actor-1', categoryId: 'cat-1', label: 'Autre' })).rejects.toBeInstanceOf(ForbiddenError)
    expect(finance.renameExpenseCategory).not.toHaveBeenCalled()
  })
})
