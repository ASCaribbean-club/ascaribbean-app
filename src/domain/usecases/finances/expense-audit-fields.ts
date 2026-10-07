import type { Expense } from '../../entities/finance'

// specs/finances-member-advances.md §4/D-A5/AC-FA-11 — the structured fields of
// an expense that go into an audit entry. The member appears by account id
// ONLY (never a name) and the free-text label NEVER appears (PO-FIE-03).
// `carrierId`, `paymentMethod`, `advancedByUserId` and `reimbursedOn` are each a
// value or null. For an advance, `paymentMethod` is the method of the
// REIMBURSEMENT (PO-FA-04).
export function expenseAuditFields(expense: Expense) {
  const { payer } = expense
  return {
    amountCents: expense.amountCents,
    spentOn: expense.spentOn,
    categoryId: expense.categoryId,
    carrierId: payer.kind === 'carrier' ? payer.carrierId : null,
    advancedByUserId: payer.kind === 'member' ? payer.userId : null,
    reimbursedOn: payer.kind === 'member' ? (payer.reimbursement?.reimbursedOn ?? null) : null,
    paymentMethod:
      payer.kind === 'carrier' ? payer.paymentMethod : (payer.reimbursement?.paymentMethod ?? null),
  }
}
