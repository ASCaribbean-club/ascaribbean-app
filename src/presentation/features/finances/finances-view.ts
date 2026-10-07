import type { CarrierKind, FinancesSnapshot } from '@domain/entities/finance'
import {
  amountsOwedToMembers,
  categoriesWithExpenses,
  checkpointTotalVarianceCents,
  expenseTotalsByCategory,
  filterExpensesByCategory,
  isCarrierArchived,
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

export type ExpenseStateTone = 'to-reimburse' | 'reimbursed'

export interface ExpenseLineView {
  id: string
  label: string
  meta: string
  amountLabel: string
  // The carrier, or "Avancé par {nom}" for an advance by a member (D-A1).
  payerLabel: string
  colorIndex: number
  // specs/finances-member-advances.md A5 — third line of an advance, in TEXT:
  // "À rembourser" or "Remboursé le {date}". null for a carrier expense.
  stateLabel: string | null
  stateTone: ExpenseStateTone | null
  // PO-FA-13 — an expense of an archived carrier is fully locked: the line is
  // never interactive, whatever the right.
  isLocked: boolean
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

// Displayable name of every account the snapshot knows (advance members first,
// then the treasurer's directory): the source of any name shown for an advance.
export function accountNames(snapshot: FinancesSnapshot): Map<string, string> {
  return new Map([...snapshot.advanceCandidates, ...snapshot.advanceMembers].map((account) => [account.userId, account.displayName]))
}

export function toExpensesTabView(
  snapshot: FinancesSnapshot,
  params: { categoryFilterId: string | null; visibleCount: number; today: string },
): ExpensesTabView {
  const categoryById = new Map(snapshot.categories.map((category) => [category.id, category]))
  const carrierById = new Map(snapshot.carriers.map((carrier) => [carrier.id, carrier]))
  const memberNameById = accountNames(snapshot)
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
    lines: shown.map((expense): ExpenseLineView => {
      const category = categoryById.get(expense.categoryId)
      const base = `${category?.label ?? 'Sans catégorie'} · ${formatShortDate(expense.spentOn)}`
      if (expense.payer.kind === 'carrier') {
        const carrier = carrierById.get(expense.payer.carrierId)
        return {
          id: expense.id,
          label: expense.label,
          meta: `${base} · ${formatExpensePaymentMethod(expense.payer.paymentMethod)}`,
          amountLabel: formatExpenseAmount(expense.amountCents),
          payerLabel: carrier?.label ?? '',
          colorIndex: category?.colorIndex ?? 0,
          stateLabel: null,
          stateTone: null,
          isLocked: carrier !== undefined && isCarrierArchived(carrier),
        }
      }
      // An advance: the method (when there is one) is the method of the
      // REIMBURSEMENT, so an advance to reimburse shows none (PO-FA-04).
      const { reimbursement } = expense.payer
      return {
        id: expense.id,
        label: expense.label,
        meta: reimbursement ? `${base} · ${formatExpensePaymentMethod(reimbursement.paymentMethod)}` : base,
        amountLabel: formatExpenseAmount(expense.amountCents),
        payerLabel: `Avancé par ${memberNameById.get(expense.payer.userId) ?? 'un membre'}`,
        colorIndex: category?.colorIndex ?? 0,
        stateLabel: reimbursement ? `Remboursé le ${formatShortDate(reimbursement.reimbursedOn)}` : 'À rembourser',
        stateTone: reimbursement ? 'reimbursed' : 'to-reimburse',
        isLocked: false,
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
  // specs/mob-treasurer-finances-edit.md §5 (O-FI-UI-04 settled): "Ouverture
  // 1 000 €" once entered, for EVERY role (reading parity); exclusive with
  // `openingMissing`.
  openingLabel: string | null
  // specs/finances-member-advances.md A7 — an archived carrier (shown only when
  // it had activity this season): text pill "Archivé", no control, not
  // interactive even for the treasurer.
  isArchived: boolean
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

export interface OwedAdvanceView {
  id: string
  label: string
  amountLabel: string
  // "4 oct. · Saison 2025-2026" — the season is ALWAYS named.
  detail: string
}

export interface OwedMemberView {
  userId: string
  name: string
  owedLabel: string
  advances: OwedAdvanceView[]
}

export interface OwedBlockView {
  totalLabel: string
  totalAriaLabel: string
  members: OwedMemberView[]
}

// specs/finances-member-advances.md A6 — null when nothing is owed (the whole
// block, title included, is then absent). Not part of TreasuryTabView: it is
// also shown under the "no current season" message.
// The ONE amount owed per member comes from the domain rule
// amountsOwedToMembers(); this only formats it.
export function toOwedBlockView(snapshot: FinancesSnapshot): OwedBlockView | null {
  const owed = amountsOwedToMembers(snapshot.outstandingAdvances, [...snapshot.advanceCandidates, ...snapshot.advanceMembers])
  if (owed.members.length === 0) return null
  return {
    totalLabel: formatFinanceAmount(owed.totalCents),
    totalAriaLabel: `Total à rembourser : ${formatFinanceAmount(owed.totalCents)}`,
    members: owed.members.map((member) => ({
      userId: member.userId,
      name: member.displayName || 'Membre',
      owedLabel: formatFinanceAmount(member.owedCents),
      advances: member.advances.map((advance) => ({
        id: advance.id,
        label: advance.label,
        amountLabel: formatFinanceAmount(advance.amountCents),
        detail: `${formatShortDate(advance.spentOn)} · Saison ${advance.seasonLabel}`,
      })),
    })),
  }
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
    hasCarriers: summary.carriers.length > 0,
    carriers: summary.carriers.map(({ carrier, theoreticalCents, openingMissing, lastCount }) => ({
      id: carrier.id,
      name: carrier.label,
      kind: carrier.kind,
      badge: carrier.kind === 'bank' ? 'BQ' : '€',
      detail: carrierDetail(carrier.kind, carrier.detail, carrier.managerName),
      balanceLabel: formatFinanceAmount(theoreticalCents),
      isBalanceNegative: theoreticalCents < 0,
      lastCountLabel: lastCount ? `Compté ${formatShortDate(lastCount.checkedOn)} : ${formatFinanceAmount(lastCount.countedCents)}` : null,
      openingMissing: openingMissing && !isCarrierArchived(carrier),
      openingLabel: isCarrierArchived(carrier) || openingMissing ? null : `Ouverture ${formatFinanceAmount(carrier.openingBalanceCents ?? 0)}`,
      isArchived: isCarrierArchived(carrier),
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
