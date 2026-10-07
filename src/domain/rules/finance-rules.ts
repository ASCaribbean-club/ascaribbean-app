import type {
  CarrierFigures,
  CarrierKind,
  Expense,
  ExpenseCategory,
  FinancesSnapshot,
  TreasuryCheckpoint,
} from '../entities/finance'

// specs/mob-treasurer-finances.md §2 "Règles pures du domaine" — the ONE place
// balances, totals and variances are computed. No ViewModel or component
// recomputes them. Mirrored by hand in record_treasury_checkpoint() (SQL), which
// freezes the theoretical amounts server-side: 'treasury_checkpoint:record'.

export function sumExpensesCents(expenses: Expense[]): number {
  return expenses.reduce((total, expense) => total + expense.amountCents, 0)
}

// theoreticalBalance(carrier) = opening balance (0 when absent) + season
// cotisation payments attributed to it - season expenses paid from it.
export function theoreticalBalanceCents(carrier: CarrierFigures, expenses: Expense[]): number {
  const spent = sumExpensesCents(expenses.filter((expense) => expense.carrierId === carrier.id))
  return (carrier.openingBalanceCents ?? 0) + carrier.incomeCents - spent
}

// variance = counted - theoretical. Zero means "Juste".
export function varianceCents(countedCents: number, theoreticalCents: number): number {
  return countedCents - theoreticalCents
}

export function isJust(varianceValueCents: number): boolean {
  return varianceValueCents === 0
}

export function checkpointTotalVarianceCents(checkpoint: TreasuryCheckpoint): number {
  return checkpoint.lines.reduce((total, line) => total + varianceCents(line.countedCents, line.theoreticalCents), 0)
}

// Most recent first: checked date, then entry time.
export function sortCheckpoints(checkpoints: TreasuryCheckpoint[]): TreasuryCheckpoint[] {
  return [...checkpoints].sort((a, b) => b.checkedOn.localeCompare(a.checkedOn) || b.recordedAt.localeCompare(a.recordedAt))
}

export interface LastCount {
  checkedOn: string
  countedCents: number
}

// The LAST point that counted this carrier — undefined if never counted (no
// misleading "0 €", AC-FI-16).
export function lastCountForCarrier(checkpoints: TreasuryCheckpoint[], carrierId: string): LastCount | undefined {
  for (const checkpoint of sortCheckpoints(checkpoints)) {
    const line = checkpoint.lines.find((candidate) => candidate.carrierId === carrierId)
    if (line) return { checkedOn: checkpoint.checkedOn, countedCents: line.countedCents }
  }
  return undefined
}

export interface CarrierBalance {
  carrier: CarrierFigures
  theoreticalCents: number
  // AC-FI-29: no opening balance entered for the season.
  openingMissing: boolean
  lastCount: LastCount | undefined
}

export interface TreasurySummary {
  carriers: CarrierBalance[]
  availableCents: number
  // Ventilation by carrier kind; the two sum to availableCents (AC-FI-14).
  availableByKind: Record<CarrierKind, number>
  // ALL season cotisation payments, attributed or not (AC-FI-15).
  incomeCents: number
  expensesCents: number
  unattributedIncomeCents: number
}

export function summarizeTreasury(snapshot: FinancesSnapshot): TreasurySummary {
  const carriers: CarrierBalance[] = snapshot.carriers.map((carrier) => ({
    carrier,
    theoreticalCents: theoreticalBalanceCents(carrier, snapshot.expenses),
    openingMissing: carrier.openingBalanceCents === null,
    lastCount: lastCountForCarrier(snapshot.checkpoints, carrier.id),
  }))
  const availableByKind: Record<CarrierKind, number> = { bank: 0, cash: 0 }
  for (const balance of carriers) availableByKind[balance.carrier.kind] += balance.theoreticalCents

  const attributedIncome = snapshot.carriers.reduce((total, carrier) => total + carrier.incomeCents, 0)
  return {
    carriers,
    availableCents: availableByKind.bank + availableByKind.cash,
    availableByKind,
    incomeCents: attributedIncome + snapshot.unattributedIncomeCents,
    expensesCents: sumExpensesCents(snapshot.expenses),
    unattributedIncomeCents: snapshot.unattributedIncomeCents,
  }
}

export interface CategoryTotal {
  category: ExpenseCategory
  totalCents: number
}

// Biggest first (legend order). Categories without an expense are omitted, so
// the totals sum to the season total (AC-FI-07).
export function expenseTotalsByCategory(expenses: Expense[], categories: ExpenseCategory[]): CategoryTotal[] {
  const totals = new Map<string, number>()
  for (const expense of expenses) totals.set(expense.categoryId, (totals.get(expense.categoryId) ?? 0) + expense.amountCents)
  return categories
    .filter((category) => totals.has(category.id))
    .map((category) => ({ category, totalCents: totals.get(category.id) ?? 0 }))
    .sort((a, b) => b.totalCents - a.totalCents || a.category.label.localeCompare(b.category.label, 'fr'))
}

// `today` is a yyyy-mm-dd date in the CLUB timezone (PO-FI-09), decided by the
// caller — domain has no clock. "Ce mois" = same yyyy-mm.
export function monthExpensesCents(expenses: Expense[], today: string): number {
  const month = today.slice(0, 7)
  return sumExpensesCents(expenses.filter((expense) => expense.spentOn.slice(0, 7) === month))
}

// Newest first: expense date, then entry time (AC-FI-09).
export function sortExpenses(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => b.spentOn.localeCompare(a.spentOn) || b.recordedAt.localeCompare(a.recordedAt))
}

// null = "Toutes". The filter restricts the LIST and its counter, never the
// summary card (AC-FI-08).
export function filterExpensesByCategory(expenses: Expense[], categoryId: string | null): Expense[] {
  return categoryId === null ? expenses : expenses.filter((expense) => expense.categoryId === categoryId)
}

// Only categories with at least one expense get a filter chip (AC-FI-08).
export function categoriesWithExpenses(expenses: Expense[], categories: ExpenseCategory[]): ExpenseCategory[] {
  const used = new Set(expenses.map((expense) => expense.categoryId))
  return categories.filter((category) => used.has(category.id))
}
