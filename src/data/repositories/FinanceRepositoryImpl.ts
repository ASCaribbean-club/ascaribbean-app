import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Expense,
  ExpenseCategory,
  ExpenseReimbursement,
  FinancesSnapshot,
  OpeningBalance,
  TreasuryCheckpointDetail,
} from '@domain/entities/finance'
import type {
  CarrierOption,
  CreateExpenseInput,
  CreateOpeningBalanceInput,
  CreateTreasuryCheckpointInput,
  FinanceRepository,
  RecordedTreasuryCheckpoint,
  UpdateExpenseInput,
  UpdateTreasuryCheckpointInput,
} from '@domain/repositories/finance-repository'
import type {
  ExpenseCategoryRow,
  ExpenseRow,
  FinanceCarrierOptionDto,
  FinancesSnapshotDto,
  OpeningBalanceRow,
  RecordedCheckpointDto,
  TreasuryCheckpointDetailDto,
} from '../dto/finances-dto'
import { NotFoundError } from '@domain/errors/not-found-error'
import { mapSupabaseError } from '../errors/map-supabase-error'
import {
  expenseRowToExpense,
  toCarrierOption,
  toCheckpointDetail,
  toExpenseCategory,
  toExpenseInsertRow,
  toExpenseUpdateRow,
  toFinancesSnapshot,
  toOpeningBalance,
  toOpeningBalanceInsertRow,
  toRecordedCheckpoint,
} from '../mappers/finances-mapper'

const EXPENSE_COLUMNS =
  'id, season_id, category_id, carrier_id, advanced_by_user_id, reimbursed_on, amount_cents, label, spent_on, payment_method, recorded_by, recorded_at'
const CATEGORY_COLUMNS = 'id, label, color_index'
const OPENING_BALANCE_COLUMNS = 'id, carrier_id, season_id, amount_cents'

// A `returns table` function can come back as a one-element array depending on
// the PostgREST version: accept both shapes.
function firstRow<T>(data: T | T[]): T {
  return Array.isArray(data) ? data[0] : data
}

// supabase/migrations/20261007081032_finances.sql (reads, inserts),
// 20261007132824_finances_edit.sql (in-place corrections, PO-FI-06 lifted) and
// 20261007151442_finances_member_advances.sql (payer: carrier or member).
// Creation is a plain INSERT (never upsert); corrections are UPDATE / DELETE
// in place, each behind its own policy or narrow function.
export class FinanceRepositoryImpl implements FinanceRepository {
  constructor(private readonly client: SupabaseClient) {}

  // get_finances_snapshot() — rule 'finances:read'. The function's own role
  // check (treasurer, authorized-officer or admin, else 42501) is the real
  // boundary; ONE aggregated call, never one per carrier (AC-FI-27).
  async getSnapshot(): Promise<FinancesSnapshot> {
    const { data, error } = await this.client.rpc('get_finances_snapshot')
    if (error) throw mapSupabaseError(error)
    return toFinancesSnapshot(data as FinancesSnapshotDto)
  }

  // get_finance_carriers() — rule 'finances:read'.
  async listCarriers(): Promise<CarrierOption[]> {
    const { data, error } = await this.client.rpc('get_finance_carriers')
    if (error) throw mapSupabaseError(error)
    return ((data ?? []) as FinanceCarrierOptionDto[]).map(toCarrierOption)
  }

  // expense_categories_select (RLS) — rule 'finances:read'.
  async listCategories(): Promise<ExpenseCategory[]> {
    const { data, error } = await this.client
      .from('expense_categories')
      .select(CATEGORY_COLUMNS)
      .order('created_at', { ascending: true })
      .overrideTypes<ExpenseCategoryRow[]>()
    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toExpenseCategory)
  }

  // expenses_insert_treasurer (RLS) — rule 'expense:record'. The RETURNING also
  // needs expenses_select (RLS, 'finances:read').
  async createExpense(input: CreateExpenseInput): Promise<Expense> {
    const { data, error } = await this.client
      .from('expenses')
      .insert(toExpenseInsertRow(input))
      .select(EXPENSE_COLUMNS)
      .single()
      .overrideTypes<ExpenseRow>()
    if (error) throw mapSupabaseError(error)
    return expenseRowToExpense(data)
  }

  // create_expense_category() — rule 'expense:record'. The server normalizes
  // the unique key (case and accents) and assigns the palette index.
  async createExpenseCategory(label: string): Promise<ExpenseCategory> {
    const { data, error } = await this.client.rpc('create_expense_category', { p_label: label })
    if (error) throw mapSupabaseError(error)
    return toExpenseCategory(data as ExpenseCategoryRow)
  }

  // opening_balances_insert_treasurer (RLS) — rule 'opening_balance:record'.
  async createOpeningBalance(input: CreateOpeningBalanceInput): Promise<OpeningBalance> {
    const { data, error } = await this.client
      .from('opening_balances')
      .insert(toOpeningBalanceInsertRow(input))
      .select(OPENING_BALANCE_COLUMNS)
      .single()
      .overrideTypes<OpeningBalanceRow>()
    if (error) throw mapSupabaseError(error)
    return toOpeningBalance(data)
  }

  // record_treasury_checkpoint() — rule 'treasury_checkpoint:record'. Atomic;
  // the theoretical amounts are computed and frozen server-side.
  async createTreasuryCheckpoint(input: CreateTreasuryCheckpointInput): Promise<RecordedTreasuryCheckpoint> {
    const { data, error } = await this.client.rpc('record_treasury_checkpoint', {
      p_checked_on: input.checkedOn,
      p_debrief: input.debrief,
      p_lines: input.counts.map((count) => ({ carrier_id: count.carrierId, counted_cents: count.countedCents })),
    })
    if (error) throw mapSupabaseError(error)
    return toRecordedCheckpoint(firstRow(data as RecordedCheckpointDto | RecordedCheckpointDto[]))
  }

  // --- specs/mob-treasurer-finances-edit.md -----------------------------

  // expenses_select (RLS) — 'finances:read'. No row (not found) = null.
  async findExpense(id: string): Promise<Expense | null> {
    const { data, error } = await this.client
      .from('expenses')
      .select(EXPENSE_COLUMNS)
      .eq('id', id)
      .maybeSingle()
      .overrideTypes<ExpenseRow>()
    if (error) throw mapSupabaseError(error)
    return data ? expenseRowToExpense(data) : null
  }

  // opening_balances_select (RLS) — 'finances:read'.
  async findOpeningBalance(carrierId: string, seasonId: string): Promise<OpeningBalance | null> {
    const { data, error } = await this.client
      .from('opening_balances')
      .select(OPENING_BALANCE_COLUMNS)
      .eq('carrier_id', carrierId)
      .eq('season_id', seasonId)
      .maybeSingle()
      .overrideTypes<OpeningBalanceRow>()
    if (error) throw mapSupabaseError(error)
    return data ? toOpeningBalance(data) : null
  }

  // get_treasury_checkpoint_detail() — 'treasury_checkpoint:update'. The
  // dedicated read that carries the debrief (PO-FIE-04).
  async getTreasuryCheckpointDetail(id: string): Promise<TreasuryCheckpointDetail | null> {
    const { data, error } = await this.client.rpc('get_treasury_checkpoint_detail', { p_id: id })
    if (error) throw mapSupabaseError(error)
    return data ? toCheckpointDetail(data as TreasuryCheckpointDetailDto) : null
  }

  // expenses_update_treasurer (RLS) — 'expense:update'. Current season only: a
  // row outside the policy affects nothing, so `.single()` raises PGRST116,
  // mapped to NotFoundError.
  async updateExpense(id: string, input: UpdateExpenseInput): Promise<Expense> {
    const { data, error } = await this.client
      .from('expenses')
      .update(toExpenseUpdateRow(input))
      .eq('id', id)
      .select(EXPENSE_COLUMNS)
      .single()
      .overrideTypes<ExpenseRow>()
    if (error) throw mapSupabaseError(error)
    return expenseRowToExpense(data)
  }

  // expenses_delete_treasurer (RLS) — 'expense:delete'. Zero affected rows
  // (gone, or out of season) is a NotFoundError, never a silent success.
  async deleteExpense(id: string): Promise<void> {
    const { data, error } = await this.client.from('expenses').delete().eq('id', id).select('id')
    if (error) throw mapSupabaseError(error)
    if (!data || data.length === 0) throw new NotFoundError(`Expense not deletable: ${id}`)
  }

  // set_expense_reimbursement() — 'expense_reimbursement:update'. Narrow
  // security-definer write on ANY season's advance (the table policy
  // expenses_update_treasurer only reaches the current season). null cancels the
  // marking. The returned row is an expenses row: no join on users, ever.
  async setExpenseReimbursement(id: string, reimbursement: ExpenseReimbursement | null): Promise<Expense> {
    const { data, error } = await this.client.rpc('set_expense_reimbursement', {
      p_expense_id: id,
      p_reimbursed_on: reimbursement?.reimbursedOn ?? null,
      p_payment_method: reimbursement?.paymentMethod ?? null,
    })
    if (error) throw mapSupabaseError(error)
    return expenseRowToExpense(firstRow(data as ExpenseRow | ExpenseRow[]))
  }

  // rename_expense_category() — 'expense_category:update'. The server
  // recomputes the normalized key; a duplicate raises 23505.
  async renameExpenseCategory(id: string, label: string): Promise<ExpenseCategory> {
    const { data, error } = await this.client.rpc('rename_expense_category', { p_id: id, p_label: label })
    if (error) throw mapSupabaseError(error)
    return toExpenseCategory(data as ExpenseCategoryRow)
  }

  // expense_categories_delete_treasurer (RLS) — 'expense_category:delete'. The
  // FK `on delete restrict` (23503) becomes ExpenseCategoryInUseError.
  async deleteExpenseCategory(id: string): Promise<void> {
    const { data, error } = await this.client.from('expense_categories').delete().eq('id', id).select('id')
    if (error) throw mapSupabaseError(error)
    if (!data || data.length === 0) throw new NotFoundError(`Expense category not deletable: ${id}`)
  }

  // opening_balances_update_treasurer (RLS) — 'opening_balance:update'. Column
  // privilege: amount_cents only.
  async updateOpeningBalance(carrierId: string, seasonId: string, amountCents: number): Promise<OpeningBalance> {
    const { data, error } = await this.client
      .from('opening_balances')
      .update({ amount_cents: amountCents })
      .eq('carrier_id', carrierId)
      .eq('season_id', seasonId)
      .select(OPENING_BALANCE_COLUMNS)
      .single()
      .overrideTypes<OpeningBalanceRow>()
    if (error) throw mapSupabaseError(error)
    return toOpeningBalance(data)
  }

  // update_treasury_checkpoint() — 'treasury_checkpoint:update'. Atomic; only
  // counted amounts and debrief, the frozen theoretical amounts are untouched.
  async updateTreasuryCheckpoint(id: string, input: UpdateTreasuryCheckpointInput): Promise<RecordedTreasuryCheckpoint> {
    const { data, error } = await this.client.rpc('update_treasury_checkpoint', {
      p_id: id,
      p_debrief: input.debrief,
      p_lines: input.counts.map((count) => ({ carrier_id: count.carrierId, counted_cents: count.countedCents })),
    })
    if (error) throw mapSupabaseError(error)
    return toRecordedCheckpoint(firstRow(data as RecordedCheckpointDto | RecordedCheckpointDto[]))
  }

  // delete_treasury_checkpoint() — 'treasury_checkpoint:delete'. Atomic: lines
  // then point, in one transaction.
  async deleteTreasuryCheckpoint(id: string): Promise<void> {
    const { error } = await this.client.rpc('delete_treasury_checkpoint', { p_id: id })
    if (error) throw mapSupabaseError(error)
  }
}
