import type { ExpensePaymentMethod } from './expense-payment-method'

// specs/mob-treasurer-finances.md §2. Amounts are INTEGER CENTS everywhere,
// never a float; the sign of an expense is a display concern (always > 0 here).
// No stored balance anywhere (AC-FI-34): balances are computed on read by
// domain/rules/finance-rules.ts.

export type CarrierKind = 'bank' | 'cash'

// "Porteur": where the money physically sits (a bank account or a cash box).
export interface FinanceCarrier {
  id: string
  label: string
  kind: CarrierKind
  // "établissement · type de compte" — optional. Never an IBAN or account number.
  detail: string | null
  // Displayable name of the cash box manager only (AC-FI-06), null for a bank.
  managerName: string | null
  // specs/finances-member-advances.md §2.6 — null = active. An archived carrier
  // always has a zero current balance (database invariant) and is no longer
  // offered for new entries; its history stays visible.
  archivedAt: string | null
}

// specs/web-finance-carriers.md §2.2 — the backoffice view of a carrier: the
// same entity plus the manager's account id (the admin edits it). The
// displayable `managerName` stays the one already carried by FinanceCarrier.
export interface AdminFinanceCarrier extends FinanceCarrier {
  managerUserId: string | null
}

// A carrier plus the two facts the database knows about the current season.
export interface CarrierFigures extends FinanceCarrier {
  // null = no opening balance entered yet for the season: treated as 0, and
  // flagged on screen (AC-FI-29).
  openingBalanceCents: number | null
  // Cotisation payments of the season attributed to this carrier.
  incomeCents: number
}

export interface ExpenseCategory {
  id: string
  label: string
  // Index into a fixed presentation palette (cycled, O-FI-UI-05) — never a color.
  colorIndex: number
}

// specs/finances-member-advances.md §2.3 — how an advance was settled. For an
// advance, the payment method is the one used to REIMBURSE the member
// (PO-FA-04 reading); the date is typed by the treasurer (PO-FA-20).
export interface ExpenseReimbursement {
  reimbursedOn: string // ISO date
  paymentMethod: ExpensePaymentMethod
}

// Exactly one payer (D-A1/D-A2): a real carrier, or a member who advanced the
// money. The union makes the states forbidden by the SQL CHECK constraints
// (both payers, a reimbursement on a carrier expense, an advance to reimburse
// with a method...) unrepresentable.
export type ExpensePayer =
  | { kind: 'carrier'; carrierId: string; paymentMethod: ExpensePaymentMethod }
  | { kind: 'member'; userId: string; reimbursement: ExpenseReimbursement | null }

export interface Expense {
  id: string
  seasonId: string
  categoryId: string
  amountCents: number // strictly positive
  label: string
  spentOn: string // ISO date (yyyy-mm-dd)
  payer: ExpensePayer
  recordedAt: string // ISO timestamp
}

// specs/finances-member-advances.md §2.2 — an advance not yet reimbursed, ALL
// seasons. Feeds the "À rembourser" block and its action.
export interface OutstandingAdvance {
  id: string
  advancedByUserId: string
  amountCents: number
  label: string
  spentOn: string
  seasonLabel: string
}

// An account, displayable name only (AC-FI-06): never a contact detail.
export interface AccountOption {
  userId: string
  displayName: string
}

export interface OpeningBalance {
  id: string
  carrierId: string
  seasonId: string
  amountCents: number // >= 0
}

export interface TreasuryCheckpointLine {
  carrierId: string
  countedCents: number
  // Frozen server-side at the time of the checkpoint (never recomputed).
  theoreticalCents: number
}

// The debrief (free text) is never read back: not needed by any screen.
export interface TreasuryCheckpoint {
  id: string
  checkedOn: string // ISO date
  recordedAt: string // ISO timestamp
  lines: TreasuryCheckpointLine[]
}

// specs/mob-treasurer-finances-edit.md §2 (PO-FIE-04) — the dedicated read
// that DOES carry the debrief, used only to prefill the correction sheet. The
// debrief is never written to the audit log (PO-FIE-03).
export interface TreasuryCheckpointDetail {
  id: string
  checkedOn: string // ISO date
  debrief: string // '' when none
  lines: TreasuryCheckpointLine[]
}

export interface FinanceSeason {
  id: string
  label: string
  startDate: string
  endDate: string
}

// One aggregated read of the current season (AC-FI-27).
export interface FinancesSnapshot {
  // null = no current season (PO-FI-09): explicit fallback.
  season: FinanceSeason | null
  carriers: CarrierFigures[]
  // Season payments with no carrier: part of the season income, of no balance.
  unattributedIncomeCents: number
  categories: ExpenseCategory[]
  // specs/mob-treasurer-finances-edit.md AC-FIE-09 — categories referenced by
  // at least one expense, ALL seasons (the snapshot's expenses cover only the
  // current season). Only an unreferenced category can be deleted.
  usedCategoryIds: string[]
  expenses: Expense[]
  checkpoints: TreasuryCheckpoint[]
  // specs/finances-member-advances.md §2.2 — not scoped to the current season.
  outstandingAdvances: OutstandingAdvance[]
  // Names of every member holding at least one advance (any season).
  advanceMembers: AccountOption[]
  // Every account, sorted by name. Only filled for a `treasurer` caller.
  advanceCandidates: AccountOption[]
}
