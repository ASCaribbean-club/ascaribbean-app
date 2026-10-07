import type { ExpenseCategory } from '../../entities/finance'
import { DuplicateExpenseCategoryError } from '../../errors/duplicate-expense-category-error'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceInputError } from '../../errors/invalid-finance-input-error'
import { NotFoundError } from '../../errors/not-found-error'
import { can } from '../../policies/can'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type { FinanceRepository } from '../../repositories/finance-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { validateCategoryRename } from '../../rules/finance-form-rules'
import { recordFinanceAudit } from './record-finance-audit'

// specs/mob-treasurer-finances-edit.md §2/AC-FIE-08 — 'expense_category:update'
// (treasurer only; mirrors rename_expense_category()). The duplicate check
// ignores the category itself (case change accepted); the server recomputes the
// normalized key, `color_index` is untouched. Same label = no-op, no audit.
// Audit 'expense_category.updated': label before/after (a reference-data
// label, not nominative free text — to be confirmed, PO-FIE-03).
export class RenameExpenseCategoryUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly financeRepository: FinanceRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: { actorId: string; categoryId: string; label: string }): Promise<ExpenseCategory> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) throw new ForbiddenError(`User not found: ${input.actorId}`)
    if (!can(user, 'expense_category:update')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to rename expense categories`)
    }

    const categories = await this.financeRepository.listCategories()
    const before = categories.find((category) => category.id === input.categoryId)
    if (!before) throw new NotFoundError(`Expense category not found: ${input.categoryId}`)

    const error = validateCategoryRename(input.label, input.categoryId, categories)
    if (error === 'duplicate') throw new DuplicateExpenseCategoryError('An expense category with this label already exists')
    if (error !== null) throw new InvalidFinanceInputError(`Invalid category label: ${error}`)

    const label = input.label.trim().replace(/\s+/g, ' ')
    if (label === before.label) return before

    const after = await this.financeRepository.renameExpenseCategory(input.categoryId, label)

    await recordFinanceAudit(
      this.auditLogRepository,
      {
        action: 'expense_category.updated',
        targetId: after.id,
        targetType: 'expense_category',
        metadata: { before: { label: before.label }, after: { label: after.label } },
      },
      { useCase: 'RenameExpenseCategoryUseCase', actorId: input.actorId },
    )

    return after
  }
}
