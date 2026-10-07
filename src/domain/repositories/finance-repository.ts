import type {
  CarrierKind,
  Expense,
  ExpenseCategory,
  ExpensePayer,
  ExpenseReimbursement,
  FinancesSnapshot,
  OpeningBalance,
  TreasuryCheckpointDetail,
} from '../entities/finance'

// specs/mob-treasurer-finances.md §2/§3 + specs/mob-treasurer-finances-edit.md.
// Reads go through security-definer functions (the real authorization
// boundary, 'finances:read'); writes are INSERTs plus, since the edit spec
// (PO-FI-06 lifted), in-place UPDATE/DELETE (no counter-entry, D-2) — each one
// backed by its own RLS policy or narrow function. The audit trail of every
// correction is emitted by the use case, never here.
export interface CreateExpenseInput {
  seasonId: string
  amountCents: number
  label: string
  spentOn: string
  categoryId: string
  // specs/finances-member-advances.md D-A1/D-A2 — a carrier OR a member.
  payer: ExpensePayer
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

// 'expense:update' — only these columns are ever modifiable (amount, label,
// date, category, payer and its reimbursement state).
export interface UpdateExpenseInput {
  amountCents: number
  label: string
  spentOn: string
  categoryId: string
  payer: ExpensePayer
}

// 'treasury_checkpoint:update' — counted amounts and debrief only (PO-FIE-02).
export interface UpdateTreasuryCheckpointInput {
  debrief: string | null
  counts: TreasuryCheckpointCountInput[]
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

  // --- specs/mob-treasurer-finances-edit.md -----------------------------
  // "State before" reads, for the audit before/after. null = not found (or
  // not visible).
  findExpense(id: string): Promise<Expense | null>
  findOpeningBalance(carrierId: string, seasonId: string): Promise<OpeningBalance | null>
  // Dedicated read carrying the debrief (PO-FIE-04).
  getTreasuryCheckpointDetail(id: string): Promise<TreasuryCheckpointDetail | null>

  // 'expense:update' / 'expense:delete' — current season only (RLS). A row that
  // no longer exists or is out of season throws NotFoundError.
  updateExpense(id: string, input: UpdateExpenseInput): Promise<Expense>
  deleteExpense(id: string): Promise<void>
  // 'expense_reimbursement:update' — set_expense_reimbursement(): sets or clears
  // (null) ONLY the reimbursement state of an advance, of ANY season, and
  // touches no carrier. NotFound-like errors: ExpenseNotReimbursableError.
  setExpenseReimbursement(id: string, reimbursement: ExpenseReimbursement | null): Promise<Expense>
  // 'expense_category:update' — the server recomputes the normalized key.
  renameExpenseCategory(id: string, label: string): Promise<ExpenseCategory>
  // 'expense_category:delete' — ExpenseCategoryInUseError when referenced.
  deleteExpenseCategory(id: string): Promise<void>
  // 'opening_balance:update' — an UPDATE of the existing (carrier, season) row.
  updateOpeningBalance(carrierId: string, seasonId: string, amountCents: number): Promise<OpeningBalance>
  // 'treasury_checkpoint:update' / 'treasury_checkpoint:delete' — atomic, the
  // frozen theoretical amounts are never touched.
  updateTreasuryCheckpoint(id: string, input: UpdateTreasuryCheckpointInput): Promise<RecordedTreasuryCheckpoint>
  deleteTreasuryCheckpoint(id: string): Promise<void>
}
