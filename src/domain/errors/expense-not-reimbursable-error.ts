import { DomainError } from './domain-error'

// specs/finances-member-advances.md §2.7 — set_expense_reimbursement() was asked
// to write on an expense that does not exist any more, or that is not an advance
// by a member (P0002 'expense_not_found' / 'expense_not_an_advance'). The sheet
// of the "À rembourser" action closes on acknowledgment and the block reloads.
export class ExpenseNotReimbursableError extends DomainError {}
