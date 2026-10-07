import { describe, expect, it } from 'vitest'
import { DuplicateExpenseCategoryError } from '../../errors/duplicate-expense-category-error'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceInputError } from '../../errors/invalid-finance-input-error'
import { CreateExpenseCategoryUseCase } from './CreateExpenseCategoryUseCase'
import { financeRepository, treasurer, userRepository, userWith } from './finance-test-support'

const existing = [{ id: 'cat-1', label: 'Équipement', colorIndex: 0 }]

describe('CreateExpenseCategoryUseCase', () => {
  it('creates a category with a trimmed, single-spaced label', async () => {
    const finance = financeRepository({ listCategories: async () => existing })
    const useCase = new CreateExpenseCategoryUseCase(userRepository(treasurer()), finance)

    const category = await useCase.execute({ actorId: 'actor-1', label: '  Matériel   médical ' })

    expect(finance.createExpenseCategory).toHaveBeenCalledWith('Matériel médical')
    expect(category.id).toBe('cat-new')
  })

  it('rejects a duplicate ignoring case and accents', async () => {
    const finance = financeRepository({ listCategories: async () => existing })
    const useCase = new CreateExpenseCategoryUseCase(userRepository(treasurer()), finance)

    await expect(useCase.execute({ actorId: 'actor-1', label: 'EQUIPEMENT' })).rejects.toBeInstanceOf(DuplicateExpenseCategoryError)
    expect(finance.createExpenseCategory).not.toHaveBeenCalled()
  })

  it('rejects an empty label', async () => {
    const finance = financeRepository()
    const useCase = new CreateExpenseCategoryUseCase(userRepository(treasurer()), finance)

    await expect(useCase.execute({ actorId: 'actor-1', label: '  ' })).rejects.toBeInstanceOf(InvalidFinanceInputError)
    expect(finance.createExpenseCategory).not.toHaveBeenCalled()
  })

  it.each([[{ role: 'authorized-officer' }], [{ role: 'admin' }]] as const)('refuses %j', async (role) => {
    const finance = financeRepository()
    const useCase = new CreateExpenseCategoryUseCase(userRepository(userWith([role])), finance)

    await expect(useCase.execute({ actorId: 'actor-1', label: 'Nouveau' })).rejects.toBeInstanceOf(ForbiddenError)
    expect(finance.createExpenseCategory).not.toHaveBeenCalled()
  })
})
