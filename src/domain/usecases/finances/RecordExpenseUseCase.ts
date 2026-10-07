import type { Expense } from '../../entities/finance'
import type { ExpensePaymentMethod } from '../../entities/expense-payment-method'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceInputError } from '../../errors/invalid-finance-input-error'
import { can } from '../../policies/can'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type { FinanceRepository } from '../../repositories/finance-repository'
import type { UserRepository } from '../../repositories/user-repository'
import {
  isValidExpenseAmountCents,
  isValidExpensePaymentMethod,
  validateExpenseDate,
  validateExpenseLabel,
} from '../../rules/finance-form-rules'

export interface RecordExpenseUseCaseInput {
  actorId: string
  seasonId: string
  seasonStartDate: string // yyyy-mm-dd
  // yyyy-mm-dd in the CLUB timezone, supplied by the caller (domain has no clock).
  today: string
  amountCents: number
  label: string
  spentOn: string
  categoryId: string
  carrierId: string
  paymentMethod: ExpensePaymentMethod
}

// specs/mob-treasurer-finances.md AC-FI-10/AC-FI-21 — 'expense:record'
// (treasurer only). Always an INSERT. The author is the session user, never a
// parameter other than the already-authenticated actor (also enforced by RLS:
// recorded_by = auth.uid()). Validations are the pure rules of
// finance-form-rules.ts, reusable by a future update use case (PO-FI-06).
//
// Audit: emitted HERE (business action, CLAUDE.md §6), after the expense is
// committed. A failure of the audit write is caught and logged only — same
// tradeoff as RecordPaymentUseCase (no shared transaction between the INSERT
// and the SECURITY DEFINER audit RPC). metadata: amount and category, NEVER the
// free-text label.
export class RecordExpenseUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly financeRepository: FinanceRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: RecordExpenseUseCaseInput): Promise<Expense> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) throw new ForbiddenError(`User not found: ${input.actorId}`)
    if (!can(user, 'expense:record')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to record expenses`)
    }

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
    if (!input.carrierId) throw new InvalidFinanceInputError('carrierId is required')
    if (!isValidExpensePaymentMethod(input.paymentMethod)) {
      throw new InvalidFinanceInputError('paymentMethod must be one of the expense payment methods')
    }

    const expense = await this.financeRepository.createExpense({
      seasonId: input.seasonId,
      amountCents: input.amountCents,
      label: input.label.trim(),
      spentOn: input.spentOn,
      categoryId: input.categoryId,
      carrierId: input.carrierId,
      paymentMethod: input.paymentMethod,
      recordedBy: user.id,
    })

    try {
      await this.auditLogRepository.record({
        action: 'expense.recorded',
        targetId: expense.id,
        targetType: 'expense',
        metadata: { amountCents: expense.amountCents, categoryId: expense.categoryId },
      })
    } catch (auditError) {
      console.error('RecordExpenseUseCase: failed to record expense.recorded audit entry', {
        actorId: input.actorId,
        targetId: expense.id,
        auditError,
      })
    }

    return expense
  }
}
