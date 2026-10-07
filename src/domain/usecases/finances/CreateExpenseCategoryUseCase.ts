import type { ExpenseCategory } from '../../entities/finance'
import { DuplicateExpenseCategoryError } from '../../errors/duplicate-expense-category-error'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceInputError } from '../../errors/invalid-finance-input-error'
import { can } from '../../policies/can'
import type { FinanceRepository } from '../../repositories/finance-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { validateCategoryLabel } from '../../rules/finance-form-rules'

// specs/mob-treasurer-finances.md AC-FI-13 / PO-FI-05 — creating a category is
// covered by 'expense:record' (no action of its own). NOT audited (default of
// §4). A blank label or a duplicate (case and accent insensitive) is rejected
// before any write; expense_categories_label_key_unique is the backstop.
export class CreateExpenseCategoryUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly financeRepository: FinanceRepository,
  ) {}

  async execute(input: { actorId: string; label: string }): Promise<ExpenseCategory> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) throw new ForbiddenError(`User not found: ${input.actorId}`)
    if (!can(user, 'expense:record')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to create expense categories`)
    }

    const existing = await this.financeRepository.listCategories()
    const error = validateCategoryLabel(input.label, existing)
    if (error === 'duplicate') throw new DuplicateExpenseCategoryError('An expense category with this label already exists')
    if (error !== null) throw new InvalidFinanceInputError(`Invalid category label: ${error}`)

    return this.financeRepository.createExpenseCategory(input.label.trim().replace(/\s+/g, ' '))
  }
}
