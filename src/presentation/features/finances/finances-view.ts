import type { CarrierKind, FinancesSnapshot } from '@domain/entities/finance'
import {
  categoriesWithExpenses,
  checkpointTotalVarianceCents,
  expenseTotalsByCategory,
  filterExpensesByCategory,
  monthExpensesCents,
  sortCheckpoints,
  sortExpenses,
  summarizeTreasury,
  sumExpensesCents,
} from '@domain/rules/finance-rules'
import { formatShortDate, formatFullDate } from '@presentation/shared/formatters/club-date'
import { formatExpensePaymentMethod } from '@presentation/shared/formatters/expense-payment-method-labels'
import { formatExpenseAmount, formatFinanceAmount, formatSignedFinanceAmount } from '@presentation/shared/formatters/finance-amounts'

// specs/mob-treasurer-finances.md §3/§5 — pure view builders. Every amount,
// total and balance comes from domain/rules/finance-rules.ts; this file only
// FORMATS (no second computation, AC-FI-24 "aucun recalcul parallèle").

export const EXPENSES_PAGE_SIZE = 20

export interface CategorySegmentView {
  id: string
  label: string
  amountLabel: string
  colorIndex: number
  // Share of the season total, for the decorative bar only.
  percent: number
}

export interface ExpenseLineView {
  id: string
  label: string
  meta: string
  amountLabel: string
  carrierLabel: string
  colorIndex: number
}

export interface FilterChipView {
  // null = "Toutes".
  id: string | null
  label: string
}

export interface ExpensesTabView {
  hasExpenses: boolean
  totalLabel: string
  monthLabel: string
  segments: CategorySegmentView[]
  filters: FilterChipView[]
  lines: ExpenseLineView[]
  countLabel: string
  hasMore: boolean
}

export function toExpensesTabView(
  snapshot: FinancesSnapshot,
  params: { categoryFilterId: string | null; visibleCount: number; today: string },
): ExpensesTabView {
  const categoryById = new Map(snapshot.categories.map((category) => [category.id, category]))
  const carrierById = new Map(snapshot.carriers.map((carrier) => [carrier.id, carrier]))
  const totalCents = sumExpensesCents(snapshot.expenses)

  const segments = expenseTotalsByCategory(snapshot.expenses, snapshot.categories).map(({ category, totalCents: categoryCents }) => ({
    id: category.id,
    label: category.label,
    amountLabel: formatFinanceAmount(categoryCents),
    colorIndex: category.colorIndex,
    percent: totalCents === 0 ? 0 : (categoryCents / totalCents) * 100,
  }))

  const filtered = filterExpensesByCategory(sortExpenses(snapshot.expenses), params.categoryFilterId)
  const shown = filtered.slice(0, params.visibleCount)

  return {
    hasExpenses: snapshot.expenses.length > 0,
    totalLabel: formatFinanceAmount(totalCents),
    monthLabel: formatFinanceAmount(monthExpensesCents(snapshot.expenses, params.today)),
    segments,
    filters: [
      { id: null, label: 'Toutes' },
      ...categoriesWithExpenses(snapshot.expenses, snapshot.categories).map((category) => ({ id: category.id, label: category.label })),
    ],
    lines: shown.map((expense) => {
      const category = categoryById.get(expense.categoryId)
      return {
        id: expense.id,
        label: expense.label,
        meta: `${category?.label ?? 'Sans catégorie'} · ${formatShortDate(expense.spentOn)} · ${formatExpensePaymentMethod(expense.paymentMethod)}`,
        amountLabel: formatExpenseAmount(expense.amountCents),
        carrierLabel: carrierById.get(expense.carrierId)?.label ?? '',
        colorIndex: category?.colorIndex ?? 0,
      }
    }),
    countLabel: `${filtered.length} dépense${filtered.length > 1 ? 's' : ''}`,
    hasMore: filtered.length > shown.length,
  }
}

export interface CarrierRowView {
  id: string
  name: string
  kind: CarrierKind
  // "BQ" or "€" (pill of the mockup).
  badge: string
  detail: string
  balanceLabel: string
  isBalanceNegative: boolean
  // "Compté 15 sept. : 4 790 €" — null when the carrier was never counted.
  lastCountLabel: string | null
  // AC-FI-29: "Solde d'ouverture non saisi".
  openingMissing: boolean
}

export interface CheckpointRowView {
  id: string
  dateLabel: string
  // Always signed text, or "Juste".
  varianceLabel: string
  isJust: boolean
}

export interface TreasuryTabView {
  availableLabel: string
  isAvailableNegative: boolean
  bankLabel: string
  cashLabel: string
  incomeLabel: string
  expensesLabel: string
  // AC-FI-32: null when there is no unattributed income.
  unattributedLabel: string | null
  hasCarriers: boolean
  carriers: CarrierRowView[]
  checkpoints: CheckpointRowView[]
}

function carrierDetail(kind: CarrierKind, detail: string | null, managerName: string | null): string {
  if (kind === 'cash') return ['Espèces', managerName].filter((part): part is string => !!part).join(' · ')
  return detail ?? 'Compte bancaire'
}

export function toTreasuryTabView(snapshot: FinancesSnapshot): TreasuryTabView {
  const summary = summarizeTreasury(snapshot)
  return {
    availableLabel: formatFinanceAmount(summary.availableCents),
    isAvailableNegative: summary.availableCents < 0,
    bankLabel: formatFinanceAmount(summary.availableByKind.bank),
    cashLabel: formatFinanceAmount(summary.availableByKind.cash),
    incomeLabel: formatFinanceAmount(summary.incomeCents),
    expensesLabel: formatFinanceAmount(summary.expensesCents),
    unattributedLabel:
      summary.unattributedIncomeCents > 0 ? `${formatFinanceAmount(summary.unattributedIncomeCents)} d'entrées sans porteur` : null,
    hasCarriers: snapshot.carriers.length > 0,
    carriers: summary.carriers.map(({ carrier, theoreticalCents, openingMissing, lastCount }) => ({
      id: carrier.id,
      name: carrier.label,
      kind: carrier.kind,
      badge: carrier.kind === 'bank' ? 'BQ' : '€',
      detail: carrierDetail(carrier.kind, carrier.detail, carrier.managerName),
      balanceLabel: formatFinanceAmount(theoreticalCents),
      isBalanceNegative: theoreticalCents < 0,
      lastCountLabel: lastCount ? `Compté ${formatShortDate(lastCount.checkedOn)} : ${formatFinanceAmount(lastCount.countedCents)}` : null,
      openingMissing,
    })),
    checkpoints: sortCheckpoints(snapshot.checkpoints).map((checkpoint) => {
      const variance = checkpointTotalVarianceCents(checkpoint)
      return {
        id: checkpoint.id,
        dateLabel: formatFullDate(checkpoint.checkedOn),
        varianceLabel: variance === 0 ? 'Juste' : `Écart ${formatSignedFinanceAmount(variance)}`,
        isJust: variance === 0,
      }
    }),
  }
}
