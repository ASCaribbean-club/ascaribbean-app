import { isExpensePaymentMethod, type ExpensePaymentMethod } from '@domain/entities/expense-payment-method'
import type {
  AccountOption,
  CarrierFigures,
  CarrierKind,
  Expense,
  ExpenseCategory,
  ExpensePayer,
  FinancesSnapshot,
  OutstandingAdvance,
  OpeningBalance,
  TreasuryCheckpoint,
  TreasuryCheckpointDetail,
} from '@domain/entities/finance'
import type {
  CarrierOption,
  CreateExpenseInput,
  CreateOpeningBalanceInput,
  RecordedTreasuryCheckpoint,
  UpdateExpenseInput,
} from '@domain/repositories/finance-repository'
import type {
  AccountOptionDto,
  ExpenseCategoryRow,
  ExpenseInsertRow,
  ExpenseRow,
  ExpenseUpdateRow,
  FinanceCarrierDto,
  FinanceCarrierOptionDto,
  FinanceCheckpointDto,
  FinanceExpenseDto,
  FinancesSnapshotDto,
  OpeningBalanceInsertRow,
  OpeningBalanceRow,
  OutstandingAdvanceDto,
  RecordedCheckpointDto,
  TreasuryCheckpointDetailDto,
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

// The three payer columns of a row -> the entity's payer union
// (specs/finances-member-advances.md §2.3). Exactly one payer is guaranteed by
// expenses_payer_check; a row with none (impossible) is a data error, never
// silently read as something else.
function toExpensePayer(row: {
  carrier_id: string | null
  advanced_by_user_id: string | null
  reimbursed_on: string | null
  payment_method: string | null
}): ExpensePayer {
  if (row.advanced_by_user_id !== null) {
    return {
      kind: 'member',
      userId: row.advanced_by_user_id,
      reimbursement:
        row.reimbursed_on !== null
          ? { reimbursedOn: row.reimbursed_on, paymentMethod: toExpensePaymentMethod(row.payment_method ?? '') }
          : null,
    }
  }
  if (row.carrier_id !== null) {
    return { kind: 'carrier', carrierId: row.carrier_id, paymentMethod: toExpensePaymentMethod(row.payment_method ?? '') }
  }
  throw new Error('Expense row without any payer (expenses_payer_check violated)')
}

// The entity's payer -> the four columns written. The inactive payer and the
// reimbursement of a carrier expense are explicitly null, so a correction that
// switches payer clears the other side (the CHECK constraints require it).
function fromExpensePayer(payer: ExpensePayer): {
  carrier_id: string | null
  advanced_by_user_id: string | null
  reimbursed_on: string | null
  payment_method: string | null
} {
  if (payer.kind === 'carrier') {
    return { carrier_id: payer.carrierId, advanced_by_user_id: null, reimbursed_on: null, payment_method: payer.paymentMethod }
  }
  return {
    carrier_id: null,
    advanced_by_user_id: payer.userId,
    reimbursed_on: payer.reimbursement?.reimbursedOn ?? null,
    payment_method: payer.reimbursement?.paymentMethod ?? null,
  }
}

export function toExpense(dto: FinanceExpenseDto): Expense {
  return {
    id: dto.id,
    seasonId: dto.season_id,
    categoryId: dto.category_id,
    amountCents: dto.amount_cents,
    label: dto.label,
    spentOn: dto.spent_on,
    payer: toExpensePayer(dto),
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
    amount_cents: input.amountCents,
    label: input.label,
    spent_on: input.spentOn,
    ...fromExpensePayer(input.payer),
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
    archivedAt: dto.archived_at ?? null,
    openingBalanceCents: dto.opening_balance_cents ?? null,
    incomeCents: dto.income_cents ?? 0,
  }
}

function toOutstandingAdvance(dto: OutstandingAdvanceDto): OutstandingAdvance {
  return {
    id: dto.id,
    advancedByUserId: dto.advanced_by_user_id,
    amountCents: dto.amount_cents,
    label: dto.label,
    spentOn: dto.spent_on,
    seasonLabel: dto.season_label,
  }
}

function toAccountOption(dto: AccountOptionDto): AccountOption {
  return { userId: dto.user_id, displayName: dto.display_name }
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
    usedCategoryIds: dto.used_category_ids ?? [],
    expenses: (dto.expenses ?? []).map(toExpense),
    checkpoints: (dto.checkpoints ?? []).map(toCheckpoint),
    outstandingAdvances: (dto.outstanding_advances ?? []).map(toOutstandingAdvance),
    advanceMembers: (dto.advance_members ?? []).map(toAccountOption),
    advanceCandidates: (dto.advance_candidates ?? []).map(toAccountOption),
  }
}

export function toRecordedCheckpoint(dto: RecordedCheckpointDto): RecordedTreasuryCheckpoint {
  return { id: dto.id, totalVarianceCents: Number(dto.total_variance_cents) }
}

// specs/mob-treasurer-finances-edit.md — 'expense:update': ONLY the columns the
// column privilege allows (payer and reimbursement state included); never
// recorded_by, recorded_at or season_id.
export function toExpenseUpdateRow(input: UpdateExpenseInput): ExpenseUpdateRow {
  return {
    category_id: input.categoryId,
    amount_cents: input.amountCents,
    label: input.label,
    spent_on: input.spentOn,
    ...fromExpensePayer(input.payer),
  }
}

// A null debrief reads as '' (nothing typed).
export function toCheckpointDetail(dto: TreasuryCheckpointDetailDto): TreasuryCheckpointDetail {
  return {
    id: dto.id,
    checkedOn: dto.checked_on,
    debrief: dto.debrief ?? '',
    lines: (dto.lines ?? []).map((line) => ({
      carrierId: line.carrier_id,
      countedCents: line.counted_cents,
      theoreticalCents: line.theoretical_cents,
    })),
  }
}
