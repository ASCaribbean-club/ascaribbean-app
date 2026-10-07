import type { AdminFinanceCarrier, CarrierKind } from '../entities/finance'
import { normalizeCategoryLabel } from './finance-form-rules'

// specs/web-finance-carriers.md §2.1/§2.2/AC-FC-05/AC-FC-06 — pure validations
// of the carrier referential, shared by the use cases and the dialog. The use
// cases stay the authority; the database CHECK constraints are the backstop.

// Bounds (PO-FC-05: "valeur au développement"). Mirrored by
// finance_carriers_label_length_check / finance_carriers_detail_length_check
// in supabase/migrations/20261007142228_finance_carriers_admin.sql.
export const MAX_CARRIER_LABEL_LENGTH = 60
export const MAX_CARRIER_DETAIL_LENGTH = 120

export const CARRIER_KINDS: readonly CarrierKind[] = ['bank', 'cash']

export function isCarrierKind(value: unknown): value is CarrierKind {
  return typeof value === 'string' && (CARRIER_KINDS as readonly string[]).includes(value)
}

// Trim + collapse inner whitespace, as the server does for the label.
export function normalizeCarrierLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ')
}

// Trimmed; empty -> null (stored as absent).
export function normalizeCarrierDetail(detail: string | null | undefined): string | null {
  const trimmed = (detail ?? '').trim()
  return trimmed === '' ? null : trimmed
}

export type CarrierLabelError = 'required' | 'too-long' | 'duplicate'

// The duplicate check ignores the carrier being edited (renaming to itself
// with another casing is accepted, AC-FC-05); `ignoreId` is null on creation.
// Uniqueness is on the normalized key, all kinds mixed (PO-FC-04); mirrored by
// the label_key computation of the SQL trigger.
export function validateCarrierLabel(
  label: string,
  ignoreId: string | null,
  existing: Pick<AdminFinanceCarrier, 'id' | 'label'>[],
): CarrierLabelError | null {
  const key = normalizeCategoryLabel(label)
  if (key === '') return 'required'
  if (normalizeCarrierLabel(label).length > MAX_CARRIER_LABEL_LENGTH) return 'too-long'
  if (existing.some((carrier) => carrier.id !== ignoreId && normalizeCategoryLabel(carrier.label) === key)) return 'duplicate'
  return null
}

export type CarrierDetailError = 'too-long'
export function validateCarrierDetail(detail: string | null | undefined): CarrierDetailError | null {
  return (detail ?? '').trim().length > MAX_CARRIER_DETAIL_LENGTH ? 'too-long' : null
}

export interface CarrierEditableFields {
  label: string
  detail: string | null
  managerUserId: string | null
}

// "Modification sans changement" (§2.2): compared as stored (normalized). A
// no-op writes nothing and emits no audit entry.
export function hasCarrierChanged(before: CarrierEditableFields, after: CarrierEditableFields): boolean {
  return (
    normalizeCarrierLabel(before.label) !== normalizeCarrierLabel(after.label) ||
    normalizeCarrierDetail(before.detail) !== normalizeCarrierDetail(after.detail) ||
    (before.managerUserId ?? null) !== (after.managerUserId ?? null)
  )
}

// specs/finances-member-advances.md §2.5 (D-B3, PO-FA-07/08) — why a carrier
// cannot be archived right now. `null` = it can. The current balance is the
// theoretical balance of the current season (opening balance + season payments
// attributed to the carrier - season expenses PAID BY it; an advance by a member
// never counts). The DATABASE stays the authority: archive_finance_carrier()
// recomputes all of this server-side, in the transaction, under a row lock, and
// never receives a balance from the client. This pure rule mirrors it by hand
// ('finance_carrier:archive') for tests and any caller holding the figures.
export type CarrierArchiveBlocker = 'no-season' | 'opening-missing' | 'non-zero-balance'

export function carrierArchiveBlocker(input: {
  hasCurrentSeason: boolean
  // null = no opening balance entered for the current season ("0 if absent" is
  // NOT enough to archive).
  openingBalanceCents: number | null
  incomeCents: number
  expensesPaidCents: number
}): CarrierArchiveBlocker | null {
  if (!input.hasCurrentSeason) return 'no-season'
  if (input.openingBalanceCents === null) return 'opening-missing'
  const balance = input.openingBalanceCents + input.incomeCents - input.expensesPaidCents
  return balance === 0 ? null : 'non-zero-balance'
}
