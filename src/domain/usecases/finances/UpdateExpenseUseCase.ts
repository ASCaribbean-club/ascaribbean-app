import type { Expense, ExpensePayer } from '../../entities/finance'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceInputError } from '../../errors/invalid-finance-input-error'
import { NotFoundError } from '../../errors/not-found-error'
import { can } from '../../policies/can'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type { FinanceRepository } from '../../repositories/finance-repository'
import type { UserRepository } from '../../repositories/user-repository'
import {
  hasExpenseChanged,
  isValidExpenseAmountCents,
  validateExpenseDate,
  validateExpenseLabel,
  validateExpensePayer,
  type ExpensePayerChoices,
} from '../../rules/finance-form-rules'
import { expenseAuditFields } from './expense-audit-fields'
import { recordFinanceAudit } from './record-finance-audit'

export interface UpdateExpenseUseCaseInput {
  actorId: string
  expenseId: string
  seasonStartDate: string // yyyy-mm-dd
  // yyyy-mm-dd in the CLUB timezone, supplied by the caller (domain has no clock).
  today: string
  amountCents: number
  label: string
  spentOn: string
  categoryId: string
  // specs/finances-member-advances.md AC-FA-06: carrier <-> member, member,
  // reimbursement state, date and method are all correctable.
  payer: ExpensePayer
  payerChoices: ExpensePayerChoices
}

// specs/mob-treasurer-finances-edit.md §2/AC-FIE-05/06/14 — 'expense:update'
// (treasurer only; mirrors expenses_update_treasurer). In-place UPDATE of the
// editable columns (payer and reimbursement state included); author,
// timestamp and season are untouched. Same pure
// validations as RecordExpenseUseCase. A no-op (nothing changed) writes
// nothing and emits NO audit entry. Audit 'expense.updated': before/after of
// the structured fields + `labelChanged`.
export class UpdateExpenseUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly financeRepository: FinanceRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: UpdateExpenseUseCaseInput): Promise<Expense> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) throw new ForbiddenError(`User not found: ${input.actorId}`)
    if (!can(user, 'expense:update')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to update expenses`)
    }

    if (!input.expenseId) throw new InvalidFinanceInputError('expenseId is required')
    if (!isValidExpenseAmountCents(input.amountCents)) {
      throw new InvalidFinanceInputError('amountCents must be a strictly positive integer number of cents')
    }
    if (validateExpenseLabel(input.label) !== null) {
      throw new InvalidFinanceInputError('label must be non-empty and within the maximum length')
    }
    if (validateExpenseDate(input.spentOn, input.today, input.seasonStartDate) !== null) {
      throw new InvalidFinanceInputError('spentOn must be a date within the current season and not in the future')
    }
    if (!input.categoryId) throw new InvalidFinanceInputError('categoryId is required')
    const payerError = validateExpensePayer(input.payer, input.spentOn, input.today, input.payerChoices)
    if (payerError) throw new InvalidFinanceInputError(`Invalid expense payer: ${payerError}`)

    const before = await this.financeRepository.findExpense(input.expenseId)
    if (!before) throw new NotFoundError(`Expense not found: ${input.expenseId}`)

    const next = {
      amountCents: input.amountCents,
      label: input.label.trim(),
      spentOn: input.spentOn,
      categoryId: input.categoryId,
      payer: input.payer,
    }
    if (!hasExpenseChanged(before, next)) return before

    const after = await this.financeRepository.updateExpense(input.expenseId, next)

    await recordFinanceAudit(
      this.auditLogRepository,
      {
        action: 'expense.updated',
        targetId: after.id,
        targetType: 'expense',
        metadata: {
          before: expenseAuditFields(before),
          after: expenseAuditFields(after),
          labelChanged: before.label.trim() !== after.label.trim(),
        },
      },
      { useCase: 'UpdateExpenseUseCase', actorId: input.actorId },
    )

    return after
  }
}
