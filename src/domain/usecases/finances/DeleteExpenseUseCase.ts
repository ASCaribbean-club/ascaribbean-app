import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceInputError } from '../../errors/invalid-finance-input-error'
import { NotFoundError } from '../../errors/not-found-error'
import { can } from '../../policies/can'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type { FinanceRepository } from '../../repositories/finance-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { expenseAuditFields } from './expense-audit-fields'
import { recordFinanceAudit } from './record-finance-audit'

// specs/mob-treasurer-finances-edit.md §2/AC-FIE-06/07/14 — 'expense:delete'
// (treasurer only; mirrors expenses_delete_treasurer, current season only).
// In-place DELETE. Audit 'expense.deleted': `before` only, structured fields,
// never the label. The audit is the only remaining trace of the amount
// (PO-FIE-09: a failed audit write leaves none — inherited, not resolved).
export class DeleteExpenseUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly financeRepository: FinanceRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: { actorId: string; expenseId: string }): Promise<void> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) throw new ForbiddenError(`User not found: ${input.actorId}`)
    if (!can(user, 'expense:delete')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to delete expenses`)
    }
    if (!input.expenseId) throw new InvalidFinanceInputError('expenseId is required')

    const before = await this.financeRepository.findExpense(input.expenseId)
    if (!before) throw new NotFoundError(`Expense not found: ${input.expenseId}`)

    await this.financeRepository.deleteExpense(input.expenseId)

    await recordFinanceAudit(
      this.auditLogRepository,
      {
        action: 'expense.deleted',
        targetId: before.id,
        targetType: 'expense',
        metadata: {
          before: expenseAuditFields(before),
        },
      },
      { useCase: 'DeleteExpenseUseCase', actorId: input.actorId },
    )
  }
}
