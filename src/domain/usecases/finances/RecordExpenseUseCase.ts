import type { Expense, ExpensePayer } from '../../entities/finance'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFinanceInputError } from '../../errors/invalid-finance-input-error'
import { can } from '../../policies/can'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type { FinanceRepository } from '../../repositories/finance-repository'
import type { UserRepository } from '../../repositories/user-repository'
import {
  isValidExpenseAmountCents,
  validateExpenseDate,
  validateExpenseLabel,
  validateExpensePayer,
  type ExpensePayerChoices,
} from '../../rules/finance-form-rules'
import { expenseAuditFields } from './expense-audit-fields'

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
  // specs/finances-member-advances.md D-A1: exactly one payer, a carrier OR a
  // member (with an optional reimbursement state).
  payer: ExpensePayer
  // The active carriers and the accounts the payer must be chosen from.
  payerChoices: ExpensePayerChoices
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
// and the SECURITY DEFINER audit RPC). metadata: amount, category, payer
// (carrier id or member account id), reimbursement date and method — NEVER the
// free-text label nor a member's name (D-A5, AC-FA-11).
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
    const payerError = validateExpensePayer(input.payer, input.spentOn, input.today, input.payerChoices)
    if (payerError) throw new InvalidFinanceInputError(`Invalid expense payer: ${payerError}`)

    const expense = await this.financeRepository.createExpense({
      seasonId: input.seasonId,
      amountCents: input.amountCents,
      label: input.label.trim(),
      spentOn: input.spentOn,
      categoryId: input.categoryId,
      payer: input.payer,
      recordedBy: user.id,
    })

    const audited = expenseAuditFields(expense)
    try {
      await this.auditLogRepository.record({
        action: 'expense.recorded',
        targetId: expense.id,
        targetType: 'expense',
        // Structured fields only: the member by account id (never a name), no label.
        metadata: {
          amountCents: expense.amountCents,
          categoryId: expense.categoryId,
          carrierId: audited.carrierId,
          advancedByUserId: audited.advancedByUserId,
          reimbursedOn: audited.reimbursedOn,
          paymentMethod: audited.paymentMethod,
        },
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
