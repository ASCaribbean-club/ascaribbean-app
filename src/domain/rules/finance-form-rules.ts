import type { ExpenseCategory, ExpensePayer, ExpenseReimbursement } from '../entities/finance'
import { isExpensePaymentMethod } from '../entities/expense-payment-method'

// specs/mob-treasurer-finances.md AC-FI-10/AC-FI-13/AC-FI-18/AC-FI-28/AC-FI-34 —
// pure validations, reusable by a FUTURE update use case (PO-FI-06) and by the
// forms (field-level messages). The use cases stay the authority; the DB CHECK
// constraints are the last line. Mirrored by hand in the migration.

// Free text bounds (PO-FI-12: "longueur maximale, valeur au développement").
// Mirrored by expenses_label_check / expense_categories_label_check /
// treasury_checkpoints_debrief_check.
export const MAX_EXPENSE_LABEL_LENGTH = 120
export const MAX_CATEGORY_LABEL_LENGTH = 40
export const MAX_DEBRIEF_LENGTH = 500

export type MoneyInputError = 'required' | 'not-positive' | 'negative' | 'too-many-decimals' | 'invalid'

// `text` is the raw input ("150.50"). `allowZero`: opening balance and counted
// amounts accept 0, an expense does not.
export function validateMoneyInput(text: string, allowZero: boolean): MoneyInputError | null {
  const trimmed = text.trim().replace(',', '.')
  if (trimmed === '') return 'required'
  const value = Number(trimmed)
  if (!Number.isFinite(value)) return 'invalid'
  if (value < 0) return 'negative'
  if (value === 0 && !allowZero) return 'not-positive'
  const decimals = trimmed.split('.')[1]
  if (decimals !== undefined && decimals.length > 2) return 'too-many-decimals'
  return null
}

export type ExpenseLabelError = 'required' | 'too-long'
export function validateExpenseLabel(label: string): ExpenseLabelError | null {
  const trimmed = label.trim()
  if (trimmed === '') return 'required'
  if (trimmed.length > MAX_EXPENSE_LABEL_LENGTH) return 'too-long'
  return null
}

export type ExpenseDateError = 'required' | 'in-future' | 'before-season'
// All dates are yyyy-mm-dd (compared lexicographically). A date equal to
// `today` or to the season start is valid.
export function validateExpenseDate(spentOn: string, today: string, seasonStart: string): ExpenseDateError | null {
  if (spentOn === '') return 'required'
  if (spentOn > today) return 'in-future'
  if (spentOn < seasonStart) return 'before-season'
  return null
}

export type DebriefError = 'too-long'
export function validateDebrief(debrief: string): DebriefError | null {
  return debrief.trim().length > MAX_DEBRIEF_LENGTH ? 'too-long' : null
}

// Strictly positive integer cents (an expense).
export function isValidExpenseAmountCents(amountCents: number): boolean {
  return Number.isInteger(amountCents) && amountCents > 0
}

// Non-negative integer cents (opening balance, counted amount).
export function isValidNonNegativeCents(amountCents: number): boolean {
  return Number.isInteger(amountCents) && amountCents >= 0
}

export function isValidExpensePaymentMethod(value: unknown): boolean {
  return isExpensePaymentMethod(value)
}

// Case- and accent-insensitive key, "Équipement" == "equipement ". Mirrored by
// the normalization of create_expense_category() (SQL): 'expense:record'.
export function normalizeCategoryLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

export type CategoryLabelError = 'required' | 'too-long' | 'duplicate'
export function validateCategoryLabel(label: string, existing: Pick<ExpenseCategory, 'label'>[]): CategoryLabelError | null {
  const key = normalizeCategoryLabel(label)
  if (key === '') return 'required'
  if (label.trim().length > MAX_CATEGORY_LABEL_LENGTH) return 'too-long'
  if (existing.some((category) => normalizeCategoryLabel(category.label) === key)) return 'duplicate'
  return null
}

// ---------------------------------------------------------------------------
// specs/mob-treasurer-finances-edit.md §2 — rules of the correction use cases
// and of the correction sheets (same pure rules, one source of truth).
// ---------------------------------------------------------------------------

// Rename: the category being renamed is excluded from the duplicate check, so
// renaming "Équipement" to "equipement" (same key, other casing) is accepted
// while a collision with ANOTHER category is refused (AC-FIE-08). Mirrored by
// rename_expense_category() (SQL): 'expense_category:update'.
export function validateCategoryRename(
  label: string,
  categoryId: string,
  existing: Pick<ExpenseCategory, 'id' | 'label'>[],
): CategoryLabelError | null {
  return validateCategoryLabel(
    label,
    existing.filter((category) => category.id !== categoryId),
  )
}

// The structured fields of an expense a correction can change.
export interface ExpenseEditableFields {
  amountCents: number
  label: string
  spentOn: string
  categoryId: string
  payer: ExpensePayer
}

function hasReimbursementChanged(before: ExpenseReimbursement | null, after: ExpenseReimbursement | null): boolean {
  if (before === null || after === null) return before !== after
  return before.reimbursedOn !== after.reimbursedOn || before.paymentMethod !== after.paymentMethod
}

// specs/finances-member-advances.md AC-FA-06 — switching carrier <-> member,
// changing the member, the carrier or its method, flipping "À rembourser" <->
// "Remboursé" and changing the reimbursement date or method all count.
export function hasPayerChanged(before: ExpensePayer, after: ExpensePayer): boolean {
  if (before.kind === 'carrier' && after.kind === 'carrier') {
    return before.carrierId !== after.carrierId || before.paymentMethod !== after.paymentMethod
  }
  if (before.kind === 'member' && after.kind === 'member') {
    return before.userId !== after.userId || hasReimbursementChanged(before.reimbursement, after.reimbursement)
  }
  return true
}

// "Modification sans changement" (§2): the label is compared TRIMMED, as it is
// stored. A no-op writes nothing and emits no audit entry.
export function hasExpenseChanged(before: ExpenseEditableFields, after: ExpenseEditableFields): boolean {
  return (
    before.amountCents !== after.amountCents ||
    before.label.trim() !== after.label.trim() ||
    before.spentOn !== after.spentOn ||
    before.categoryId !== after.categoryId ||
    hasPayerChanged(before.payer, after.payer)
  )
}

// ---------------------------------------------------------------------------
// specs/finances-member-advances.md §2.3 — payer and reimbursement rules.
// Mirrored by hand in the CHECK constraints of public.expenses
// (expenses_payer_check, expenses_reimbursement_check,
// expenses_payment_method_payer_check) and in set_expense_reimbursement()
// ('expense_reimbursement:update').
// ---------------------------------------------------------------------------

export type ReimbursementDateError = 'required' | 'in-future' | 'before-expense'

// Same shape as validateExpenseDate: yyyy-mm-dd compared lexicographically; a
// date equal to `today` or to the expense date is valid (`today` = club date,
// supplied by the caller).
export function validateReimbursementDate(reimbursedOn: string, today: string, spentOn: string): ReimbursementDateError | null {
  if (reimbursedOn === '') return 'required'
  if (reimbursedOn > today) return 'in-future'
  if (reimbursedOn < spentOn) return 'before-expense'
  return null
}

export type ExpensePayerError =
  | 'carrier-unknown'
  | 'member-unknown'
  | 'payment-method-invalid'
  | `reimbursement-${ReimbursementDateError}`

// What the caller is allowed to pick from: ACTIVE carriers (non archived) and
// the account list.
export interface ExpensePayerChoices {
  activeCarrierIds: readonly string[]
  memberUserIds: readonly string[]
}

// Exactly one payer (guaranteed by the union): an active known carrier with a
// valid method, or a known account whose optional reimbursement carries a
// date within bounds and a valid method. An advance still to reimburse carries
// NO method (PO-FA-04); a carrier expense carries NO reimbursement (both are
// unrepresentable in the type).
export function validateExpensePayer(
  payer: ExpensePayer,
  spentOn: string,
  today: string,
  choices: ExpensePayerChoices,
): ExpensePayerError | null {
  if (payer.kind === 'carrier') {
    if (!choices.activeCarrierIds.includes(payer.carrierId)) return 'carrier-unknown'
    if (!isValidExpensePaymentMethod(payer.paymentMethod)) return 'payment-method-invalid'
    return null
  }
  if (!choices.memberUserIds.includes(payer.userId)) return 'member-unknown'
  if (payer.reimbursement === null) return null
  const dateError = validateReimbursementDate(payer.reimbursement.reimbursedOn, today, spentOn)
  if (dateError) return `reimbursement-${dateError}`
  if (!isValidExpensePaymentMethod(payer.reimbursement.paymentMethod)) return 'payment-method-invalid'
  return null
}

export interface CheckpointCount {
  carrierId: string
  countedCents: number
}

// A checkpoint correction changes something iff a counted amount differs or the
// (trimmed) debrief differs (PO-FIE-02: nothing else is correctable).
export function hasCheckpointChanged(
  before: { counts: CheckpointCount[]; debrief: string },
  after: { counts: CheckpointCount[]; debrief: string },
): boolean {
  if (before.debrief.trim() !== after.debrief.trim()) return true
  const beforeByCarrier = new Map(before.counts.map((count) => [count.carrierId, count.countedCents]))
  if (beforeByCarrier.size !== after.counts.length) return true
  return after.counts.some((count) => beforeByCarrier.get(count.carrierId) !== count.countedCents)
}
