import { ForbiddenError } from '../../errors/forbidden-error'
import { NotFoundError } from '../../errors/not-found-error'
import { can } from '../../policies/can'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type { FinanceRepository } from '../../repositories/finance-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { recordFinanceAudit } from './record-finance-audit'

// specs/mob-treasurer-finances-edit.md §2/AC-FIE-09 — 'expense_category:delete'
// (treasurer only; mirrors expense_categories_delete_treasurer). Only an
// UNUSED category can go: the UI hides the control otherwise, and the FK
// `on delete restrict` is the last line (ExpenseCategoryInUseError, mapped in
// data/). Audit 'expense_category.deleted': the label (before only).
export class DeleteExpenseCategoryUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly financeRepository: FinanceRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: { actorId: string; categoryId: string }): Promise<void> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) throw new ForbiddenError(`User not found: ${input.actorId}`)
    if (!can(user, 'expense_category:delete')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to delete expense categories`)
    }

    const categories = await this.financeRepository.listCategories()
    const before = categories.find((category) => category.id === input.categoryId)
    if (!before) throw new NotFoundError(`Expense category not found: ${input.categoryId}`)

    await this.financeRepository.deleteExpenseCategory(input.categoryId)

    await recordFinanceAudit(
      this.auditLogRepository,
      {
        action: 'expense_category.deleted',
        targetId: before.id,
        targetType: 'expense_category',
        metadata: { before: { label: before.label } },
      },
      { useCase: 'DeleteExpenseCategoryUseCase', actorId: input.actorId },
    )
  }
}
