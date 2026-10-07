import type { ExpenseCategory } from '../entities/finance'
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
