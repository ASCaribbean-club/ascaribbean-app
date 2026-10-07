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

export interface Expense {
  id: string
  categoryId: string
  carrierId: string
  amountCents: number // strictly positive
  label: string
  spentOn: string // ISO date (yyyy-mm-dd)
  paymentMethod: ExpensePaymentMethod
  recordedAt: string // ISO timestamp
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
  expenses: Expense[]
  checkpoints: TreasuryCheckpoint[]
}
