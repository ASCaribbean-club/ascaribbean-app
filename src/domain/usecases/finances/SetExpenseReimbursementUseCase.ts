import type { Expense, ExpenseReimbursement } from '../../entities/finance'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceInputError } from '../../errors/invalid-finance-input-error'
import { NotFoundError } from '../../errors/not-found-error'
import { can } from '../../policies/can'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type { FinanceRepository } from '../../repositories/finance-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { hasPayerChanged, isValidExpensePaymentMethod, validateReimbursementDate } from '../../rules/finance-form-rules'
import { recordFinanceAudit } from './record-finance-audit'

export interface SetExpenseReimbursementUseCaseInput {
  actorId: string
  expenseId: string
  // yyyy-mm-dd in the CLUB timezone, supplied by the caller (domain has no clock).
  today: string
  // null = cancel the marking (back to "À rembourser").
  reimbursement: ExpenseReimbursement | null
}

function reimbursementFields(expense: Expense) {
  const reimbursement = expense.payer.kind === 'member' ? expense.payer.reimbursement : null
  return { reimbursedOn: reimbursement?.reimbursedOn ?? null, paymentMethod: reimbursement?.paymentMethod ?? null }
}

// specs/finances-member-advances.md §2.7/AC-FA-31/35 —
// 'expense_reimbursement:update' (treasurer only; mirrors the role guard of
// set_expense_reimbursement(), PO-FA-21 default). Sets or clears the
// reimbursement state of an advance of ANY season and touches nothing else, no
// carrier included (PO-FA-18, OPEN). Order: right, pure validations that need
// no data (before any network call), read of the state BEFORE, validation that
// needs the advance date, write, audit. No change = nothing written and NO
// audit entry. Audit 'expense.reimbursement_updated': before/after of
// reimbursedOn and paymentMethod, with advancedByUserId (account id, never a
// name), amountCents and seasonId recalled — never a label.
export class SetExpenseReimbursementUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly financeRepository: FinanceRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: SetExpenseReimbursementUseCaseInput): Promise<Expense> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) throw new ForbiddenError(`User not found: ${input.actorId}`)
    if (!can(user, 'expense_reimbursement:update')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to update expense reimbursements`)
    }

    if (!input.expenseId) throw new InvalidFinanceInputError('expenseId is required')
    if (input.reimbursement !== null) {
      if (input.reimbursement.reimbursedOn === '') throw new InvalidFinanceInputError('reimbursedOn is required')
      if (input.reimbursement.reimbursedOn > input.today) {
        throw new InvalidFinanceInputError('reimbursedOn must not be in the future')
      }
      if (!isValidExpensePaymentMethod(input.reimbursement.paymentMethod)) {
        throw new InvalidFinanceInputError('paymentMethod must be one of the expense payment methods')
      }
    }

    const before = await this.financeRepository.findExpense(input.expenseId)
    if (!before) throw new NotFoundError(`Expense not found: ${input.expenseId}`)
    if (before.payer.kind !== 'member') {
      throw new InvalidFinanceInputError('Only an advance by a member has a reimbursement state')
    }
    if (input.reimbursement !== null) {
      const dateError = validateReimbursementDate(input.reimbursement.reimbursedOn, input.today, before.spentOn)
      if (dateError) throw new InvalidFinanceInputError(`Invalid reimbursement date: ${dateError}`)
    }

    const next = { ...before.payer, reimbursement: input.reimbursement }
    if (!hasPayerChanged(before.payer, next)) return before

    const after = await this.financeRepository.setExpenseReimbursement(input.expenseId, input.reimbursement)

    await recordFinanceAudit(
      this.auditLogRepository,
      {
        action: 'expense.reimbursement_updated',
        targetId: after.id,
        targetType: 'expense',
        metadata: {
          before: reimbursementFields(before),
          after: reimbursementFields(after),
          advancedByUserId: before.payer.userId,
          amountCents: after.amountCents,
          seasonId: after.seasonId,
        },
      },
      { useCase: 'SetExpenseReimbursementUseCase', actorId: input.actorId },
    )

    return after
  }
}
