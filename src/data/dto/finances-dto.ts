// specs/mob-treasurer-finances.md — raw shapes of the finance reads/writes.
// Row convention (CLAUDE.md §4): one table's columns. Dto: RPC return values
// (get_finances_snapshot() is an inline aggregation with no view behind it).
// See supabase/migrations/20261007081032_finances.sql.

export interface ExpenseRow {
  id: string
  season_id: string
  category_id: string
  carrier_id: string
  amount_cents: number
  label: string
  spent_on: string
  payment_method: string
  recorded_by: string
  recorded_at: string
}

export interface ExpenseInsertRow {
  season_id: string
  category_id: string
  carrier_id: string
  amount_cents: number
  label: string
  spent_on: string
  payment_method: string
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
  opening_balance_cents: number | null
  income_cents: number | null
}

export interface FinanceExpenseDto {
  id: string
  category_id: string
  carrier_id: string
  amount_cents: number
  label: string
  spent_on: string
  payment_method: string
  recorded_at: string
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
  expenses: FinanceExpenseDto[] | null
  checkpoints: FinanceCheckpointDto[] | null
}

// Return value of record_treasury_checkpoint().
export interface RecordedCheckpointDto {
  id: string
  total_variance_cents: number
}
