// specs/mob-treasurer-finances.md — raw shapes of the finance reads/writes.
// Row convention (CLAUDE.md §4): one table's columns. Dto: RPC return values
// (get_finances_snapshot() is an inline aggregation with no view behind it).
// See supabase/migrations/20261007081032_finances.sql and
// 20261007151442_finances_member_advances.sql (payer: carrier OR member).

export interface ExpenseRow {
  id: string
  season_id: string
  category_id: string
  // Exactly one of carrier_id / advanced_by_user_id is set (expenses_payer_check).
  carrier_id: string | null
  advanced_by_user_id: string | null
  // null = to reimburse (advance) — always null for a carrier expense.
  reimbursed_on: string | null
  amount_cents: number
  label: string
  spent_on: string
  // For an advance: the method of the REIMBURSEMENT (null until reimbursed).
  payment_method: string | null
  recorded_by: string
  recorded_at: string
}

export interface ExpenseInsertRow {
  season_id: string
  category_id: string
  carrier_id: string | null
  advanced_by_user_id: string | null
  reimbursed_on: string | null
  amount_cents: number
  label: string
  spent_on: string
  payment_method: string | null
  recorded_by: string
}

export interface ExpenseCategoryRow {
  id: string
  label: string
  color_index: number
}

export interface OpeningBalanceRow {
  id: string
  carrier_id: string
  season_id: string
  amount_cents: number
}

export interface OpeningBalanceInsertRow {
  carrier_id: string
  season_id: string
  amount_cents: number
  recorded_by: string
}

export interface FinanceCarrierOptionDto {
  id: string
  label: string
  kind: string
}

export interface FinanceCarrierDto {
  id: string
  label: string
  kind: string
  detail: string | null
  manager_name: string | null
  archived_at: string | null
  opening_balance_cents: number | null
  income_cents: number | null
}

export interface FinanceExpenseDto {
  id: string
  season_id: string
  category_id: string
  carrier_id: string | null
  advanced_by_user_id: string | null
  reimbursed_on: string | null
  amount_cents: number
  label: string
  spent_on: string
  payment_method: string | null
  recorded_at: string
}

// specs/finances-member-advances.md §2.2 — element of `outstanding_advances`.
export interface OutstandingAdvanceDto {
  id: string
  advanced_by_user_id: string
  amount_cents: number
  label: string
  spent_on: string
  season_label: string
}

// Element of `advance_members` / `advance_candidates`: displayable name only.
export interface AccountOptionDto {
  user_id: string
  display_name: string
}

export interface FinanceCheckpointLineDto {
  carrier_id: string
  counted_cents: number
  theoretical_cents: number
}

export interface FinanceCheckpointDto {
  id: string
  checked_on: string
  recorded_at: string
  lines: FinanceCheckpointLineDto[] | null
}

// jsonb returned by get_finances_snapshot(). `season` null = no current season.
export interface FinancesSnapshotDto {
  season: { id: string; label: string; start_date: string; end_date: string } | null
  carriers: FinanceCarrierDto[] | null
  unattributed_income_cents: number | null
  categories: ExpenseCategoryRow[] | null
  used_category_ids: string[] | null
  expenses: FinanceExpenseDto[] | null
  checkpoints: FinanceCheckpointDto[] | null
  outstanding_advances: OutstandingAdvanceDto[] | null
  advance_members: AccountOptionDto[] | null
  advance_candidates: AccountOptionDto[] | null
}

// Return value of record_treasury_checkpoint().
export interface RecordedCheckpointDto {
  id: string
  total_variance_cents: number
}

// specs/mob-treasurer-finances-edit.md — jsonb returned by
// get_treasury_checkpoint_detail() (debrief included, PO-FIE-04). null when the
// point does not exist.
export interface TreasuryCheckpointDetailDto {
  id: string
  checked_on: string
  debrief: string | null
  lines: FinanceCheckpointLineDto[] | null
}

// Columns writable by 'expense:update' (column privilege of the migration).
export interface ExpenseUpdateRow {
  category_id: string
  carrier_id: string | null
  advanced_by_user_id: string | null
  reimbursed_on: string | null
  amount_cents: number
  label: string
  spent_on: string
  payment_method: string | null
}
