import type { ExpenseCategory, Expense, FinancesSnapshot, OpeningBalance, CarrierKind } from '../entities/finance'
import type { ExpensePaymentMethod } from '../entities/expense-payment-method'

// specs/mob-treasurer-finances.md §2/§3. Reads go through security-definer
// functions (the real authorization boundary, 'finances:read'); writes are
// INSERT-only: there is NO update/delete on this interface because no RLS
// policy grants one in this pass (PO-FI-06) — immutability by absence of right,
// not by construction.
export interface CreateExpenseInput {
  seasonId: string
  amountCents: number
  label: string
  spentOn: string
  categoryId: string
  carrierId: string
  paymentMethod: ExpensePaymentMethod
  recordedBy: string
}

export interface CreateOpeningBalanceInput {
  carrierId: string
  seasonId: string
  amountCents: number
  recordedBy: string
}

export interface TreasuryCheckpointCountInput {
  carrierId: string
  countedCents: number
}

export interface CreateTreasuryCheckpointInput {
  checkedOn: string
  debrief: string | null
  counts: TreasuryCheckpointCountInput[]
}

export interface RecordedTreasuryCheckpoint {
  id: string
  // Sum over carriers of (counted - theoretical), computed server-side.
  totalVarianceCents: number
}

export interface CarrierOption {
  id: string
  label: string
  kind: CarrierKind
}

export interface FinanceRepository {
  getSnapshot(): Promise<FinancesSnapshot>
  // Only id/label/kind, for the optional "Porteur" field of the payment forms.
  listCarriers(): Promise<CarrierOption[]>
  listCategories(): Promise<ExpenseCategory[]>
  createExpense(input: CreateExpenseInput): Promise<Expense>
  // Server-side: normalization of the unique key and palette index.
  createExpenseCategory(label: string): Promise<ExpenseCategory>
  createOpeningBalance(input: CreateOpeningBalanceInput): Promise<OpeningBalance>
  // Atomic (point + one line per carrier); the theoretical amounts are computed
  // by the server and frozen, never received from the client (AC-FI-19).
  createTreasuryCheckpoint(input: CreateTreasuryCheckpointInput): Promise<RecordedTreasuryCheckpoint>
}
