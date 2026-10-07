import { isExpensePaymentMethod, type ExpensePaymentMethod } from '@domain/entities/expense-payment-method'
import type {
  CarrierFigures,
  CarrierKind,
  Expense,
  ExpenseCategory,
  FinancesSnapshot,
  OpeningBalance,
  TreasuryCheckpoint,
} from '@domain/entities/finance'
import type {
  CarrierOption,
  CreateExpenseInput,
  CreateOpeningBalanceInput,
  RecordedTreasuryCheckpoint,
} from '@domain/repositories/finance-repository'
import type {
  ExpenseCategoryRow,
  ExpenseInsertRow,
  ExpenseRow,
  FinanceCarrierDto,
  FinanceCarrierOptionDto,
  FinanceCheckpointDto,
  FinanceExpenseDto,
  FinancesSnapshotDto,
  OpeningBalanceInsertRow,
  OpeningBalanceRow,
  RecordedCheckpointDto,
} from '../dto/finances-dto'

// An unknown stored kind (impossible under the CHECK) reads as a bank.
function toCarrierKind(value: string): CarrierKind {
  return value === 'cash' ? 'cash' : 'bank'
}

// An unknown stored method (impossible under the CHECK) reads as card.
function toExpensePaymentMethod(value: string): ExpensePaymentMethod {
  return isExpensePaymentMethod(value) ? value : 'card'
}

export function toExpenseCategory(row: ExpenseCategoryRow): ExpenseCategory {
  return { id: row.id, label: row.label, colorIndex: row.color_index }
}

export function toExpense(dto: FinanceExpenseDto): Expense {
  return {
    id: dto.id,
    categoryId: dto.category_id,
    carrierId: dto.carrier_id,
    amountCents: dto.amount_cents,
    label: dto.label,
    spentOn: dto.spent_on,
    paymentMethod: toExpensePaymentMethod(dto.payment_method),
    recordedAt: dto.recorded_at,
  }
}

export function expenseRowToExpense(row: ExpenseRow): Expense {
  return toExpense(row)
}

export function toExpenseInsertRow(input: CreateExpenseInput): ExpenseInsertRow {
  return {
    season_id: input.seasonId,
    category_id: input.categoryId,
    carrier_id: input.carrierId,
    amount_cents: input.amountCents,
    label: input.label,
    spent_on: input.spentOn,
    payment_method: input.paymentMethod,
    recorded_by: input.recordedBy,
  }
}

export function toOpeningBalance(row: OpeningBalanceRow): OpeningBalance {
  return { id: row.id, carrierId: row.carrier_id, seasonId: row.season_id, amountCents: row.amount_cents }
}

export function toOpeningBalanceInsertRow(input: CreateOpeningBalanceInput): OpeningBalanceInsertRow {
  return {
    carrier_id: input.carrierId,
    season_id: input.seasonId,
    amount_cents: input.amountCents,
    recorded_by: input.recordedBy,
  }
}

export function toCarrierOption(dto: FinanceCarrierOptionDto): CarrierOption {
  return { id: dto.id, label: dto.label, kind: toCarrierKind(dto.kind) }
}

function toCarrierFigures(dto: FinanceCarrierDto): CarrierFigures {
  return {
    id: dto.id,
    label: dto.label,
    kind: toCarrierKind(dto.kind),
    detail: dto.detail ?? null,
    managerName: dto.manager_name ?? null,
    openingBalanceCents: dto.opening_balance_cents ?? null,
    incomeCents: dto.income_cents ?? 0,
  }
}

function toCheckpoint(dto: FinanceCheckpointDto): TreasuryCheckpoint {
  return {
    id: dto.id,
    checkedOn: dto.checked_on,
    recordedAt: dto.recorded_at,
    lines: (dto.lines ?? []).map((line) => ({
      carrierId: line.carrier_id,
      countedCents: line.counted_cents,
      theoreticalCents: line.theoretical_cents,
    })),
  }
}

export function toFinancesSnapshot(dto: FinancesSnapshotDto): FinancesSnapshot {
  return {
    season: dto.season
      ? { id: dto.season.id, label: dto.season.label, startDate: dto.season.start_date, endDate: dto.season.end_date }
      : null,
    carriers: (dto.carriers ?? []).map(toCarrierFigures),
    unattributedIncomeCents: dto.unattributed_income_cents ?? 0,
    categories: (dto.categories ?? []).map(toExpenseCategory),
    expenses: (dto.expenses ?? []).map(toExpense),
    checkpoints: (dto.checkpoints ?? []).map(toCheckpoint),
  }
}

export function toRecordedCheckpoint(dto: RecordedCheckpointDto): RecordedTreasuryCheckpoint {
  return { id: dto.id, totalVarianceCents: Number(dto.total_variance_cents) }
}
