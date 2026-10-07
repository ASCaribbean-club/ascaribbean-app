import type { SupabaseClient } from '@supabase/supabase-js'
import type { Expense, ExpenseCategory, FinancesSnapshot, OpeningBalance } from '@domain/entities/finance'
import type {
  CarrierOption,
  CreateExpenseInput,
  CreateOpeningBalanceInput,
  CreateTreasuryCheckpointInput,
  FinanceRepository,
  RecordedTreasuryCheckpoint,
} from '@domain/repositories/finance-repository'
import type {
  ExpenseCategoryRow,
  ExpenseRow,
  FinanceCarrierOptionDto,
  FinancesSnapshotDto,
  OpeningBalanceRow,
  RecordedCheckpointDto,
} from '../dto/finances-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import {
  expenseRowToExpense,
  toCarrierOption,
  toExpenseCategory,
  toExpenseInsertRow,
  toFinancesSnapshot,
  toOpeningBalance,
  toOpeningBalanceInsertRow,
  toRecordedCheckpoint,
} from '../mappers/finances-mapper'

const EXPENSE_COLUMNS = 'id, season_id, category_id, carrier_id, amount_cents, label, spent_on, payment_method, recorded_by, recorded_at'
const CATEGORY_COLUMNS = 'id, label, color_index'
const OPENING_BALANCE_COLUMNS = 'id, carrier_id, season_id, amount_cents'

// supabase/migrations/20261007081032_finances.sql. Every write is a plain
// INSERT (never upsert, never update/delete: no such policy exists, PO-FI-06).
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
    return toRecordedCheckpoint(data as RecordedCheckpointDto)
  }
}
