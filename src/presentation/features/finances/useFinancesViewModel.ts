import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clubToday } from '@presentation/shared/formatters/club-date'
import { useNow } from '@presentation/shared/hooks/use-now'
import { useActiveRole } from '@presentation/shared/hooks/use-active-role'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { EXPENSES_PAGE_SIZE, toExpensesTabView, toTreasuryTabView } from './finances-view'
import { useFinancesSnapshot } from './use-finances-snapshot'

export type FinancesTab = 'expenses' | 'treasury'

// specs/mob-treasurer-finances.md — ONE screen, two tabs, three bottom sheets.
// 'finances:read' is UX only (menu card / URL guard): get_finances_snapshot()
// is the real boundary. The write booleans decide whether a control is
// RENDERED AT ALL (absent, never greyed — AC-FI-03): the use cases and the RLS
// policies are the real gates. Without a current season no write control is
// offered, even to the treasurer (PO-FI-09).
export function useFinancesViewModel() {
  const navigate = useNavigate()
  const now = useNow()
  const today = clubToday(now)

  const canViewFinances = usePermission('finances:read')
  // can() checks every role the account holds: a Trésorier browsing in their
  // Dirigeant (or Joueur) view must not get write controls from the dormant
  // treasurer role. Every write action is treasurer-only, so they follow the
  // active dashboard role.
  const { isTreasurerView } = useActiveRole()
  const canRecordExpensePermission = usePermission('expense:record') && isTreasurerView
  const canRecordOpeningBalancePermission = usePermission('opening_balance:record') && isTreasurerView
  const canRecordCheckpointPermission = usePermission('treasury_checkpoint:record') && isTreasurerView

  const snapshotQuery = useFinancesSnapshot(canViewFinances)
  const snapshot = snapshotQuery.data

  const [tab, setTab] = useState<FinancesTab>('expenses')
  const [categoryFilterId, setCategoryFilterId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(EXPENSES_PAGE_SIZE)
  const [isExpenseSheetOpen, setIsExpenseSheetOpen] = useState(false)
  const [isCheckpointSheetOpen, setIsCheckpointSheetOpen] = useState(false)
  const [openingBalanceCarrierId, setOpeningBalanceCarrierId] = useState<string | null>(null)

  const hasSeason = snapshot !== undefined && snapshot.season !== null
  const hasCarriers = snapshot !== undefined && snapshot.carriers.length > 0
  const canWrite = hasSeason && hasCarriers

  // A filter pointing at a category that no longer has an expense falls back to "Toutes".
  const effectiveFilterId =
    snapshot !== undefined && categoryFilterId !== null && snapshot.expenses.some((expense) => expense.categoryId === categoryFilterId)
      ? categoryFilterId
      : null

  const canRecordExpense = canRecordExpensePermission && canWrite
  const canRecordCheckpoint = canRecordCheckpointPermission && canWrite
  const canRecordOpeningBalance = canRecordOpeningBalancePermission && hasSeason

  const openingBalanceCarrier =
    canRecordOpeningBalance && openingBalanceCarrierId !== null
      ? (snapshot?.carriers.find((carrier) => carrier.id === openingBalanceCarrierId) ?? null)
      : null

  return {
    canViewFinances,
    canRecordExpense,
    canRecordOpeningBalance,
    canRecordCheckpoint,

    isLoading: snapshotQuery.isLoading,
    hasError: snapshotQuery.isError,
    retry: () => void snapshotQuery.refetch(),
    hasNoSeason: snapshot !== undefined && snapshot.season === null,
    goBack: () => navigate(-1),

    title: 'Finances',
    subtitle: snapshot?.season ? `Saison ${snapshot.season.label}` : undefined,
    snapshot,
    today,

    tab,
    selectTab: (value: string) => {
      if (value === 'expenses' || value === 'treasury') setTab(value)
    },

    expensesView: snapshot ? toExpensesTabView(snapshot, { categoryFilterId: effectiveFilterId, visibleCount, today }) : null,
    treasuryView: snapshot ? toTreasuryTabView(snapshot) : null,

    categoryFilterId: effectiveFilterId,
    selectCategoryFilter: (id: string | null) => {
      setCategoryFilterId(id)
      setVisibleCount(EXPENSES_PAGE_SIZE)
    },
    showMore: () => setVisibleCount((count) => count + EXPENSES_PAGE_SIZE),

    isExpenseSheetOpen: canRecordExpense && isExpenseSheetOpen,
    openExpenseSheet: () => setIsExpenseSheetOpen(true),
    closeExpenseSheet: () => setIsExpenseSheetOpen(false),

    isCheckpointSheetOpen: canRecordCheckpoint && isCheckpointSheetOpen,
    openCheckpointSheet: () => setIsCheckpointSheetOpen(true),
    closeCheckpointSheet: () => setIsCheckpointSheetOpen(false),

    openingBalanceCarrier,
    openOpeningBalanceSheet: (carrierId: string) => setOpeningBalanceCarrierId(carrierId),
    closeOpeningBalanceSheet: () => setOpeningBalanceCarrierId(null),
  }
}
