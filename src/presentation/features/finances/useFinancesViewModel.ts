import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { activeCarriers, isCarrierArchived, expenseCarrierId } from '@domain/rules/finance-rules'
import { clubToday } from '@presentation/shared/formatters/club-date'
import { useNow } from '@presentation/shared/hooks/use-now'
import { useActiveRole } from '@presentation/shared/hooks/use-active-role'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'
import { EXPENSES_PAGE_SIZE, accountNames, toExpensesTabView, toOwedBlockView, toTreasuryTabView } from './finances-view'
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
  const queryClient = useQueryClient()
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
  // specs/mob-treasurer-finances-edit.md AC-FIE-02/16 — SAME lock as the entry
  // controls: right AND active treasurer view. Absent, never greyed; the RLS
  // policies / functions are the real boundary.
  const canUpdateExpensePermission = usePermission('expense:update') && isTreasurerView
  const canDeleteExpensePermission = usePermission('expense:delete') && isTreasurerView
  const canRenameCategoryPermission = usePermission('expense_category:update') && isTreasurerView
  const canDeleteCategoryPermission = usePermission('expense_category:delete') && isTreasurerView
  const canUpdateOpeningBalancePermission = usePermission('opening_balance:update') && isTreasurerView
  const canUpdateCheckpointPermission = usePermission('treasury_checkpoint:update') && isTreasurerView
  const canDeleteCheckpointPermission = usePermission('treasury_checkpoint:delete') && isTreasurerView
  // specs/finances-member-advances.md AC-FA-33 — SAME lock for the action of the
  // "À rembourser" block: right AND active treasurer view.
  const canUpdateReimbursementPermission = usePermission('expense_reimbursement:update') && isTreasurerView

  const snapshotQuery = useFinancesSnapshot(canViewFinances)
  const snapshot = snapshotQuery.data

  const [tab, setTab] = useState<FinancesTab>('expenses')
  const [categoryFilterId, setCategoryFilterId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(EXPENSES_PAGE_SIZE)
  const [isExpenseSheetOpen, setIsExpenseSheetOpen] = useState(false)
  const [isCheckpointSheetOpen, setIsCheckpointSheetOpen] = useState(false)
  const [openingBalanceCarrierId, setOpeningBalanceCarrierId] = useState<string | null>(null)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [editingCheckpointId, setEditingCheckpointId] = useState<string | null>(null)
  const [reimbursingAdvanceId, setReimbursingAdvanceId] = useState<string | null>(null)

  const hasSeason = snapshot !== undefined && snapshot.season !== null
  // PO-FA-15 — "at least one ACTIVE carrier": an archived one is no payer.
  const hasCarriers = snapshot !== undefined && activeCarriers(snapshot.carriers).length > 0
  const canWrite = hasSeason && hasCarriers

  // A filter pointing at a category that no longer has an expense falls back to "Toutes".
  const effectiveFilterId =
    snapshot !== undefined && categoryFilterId !== null && snapshot.expenses.some((expense) => expense.categoryId === categoryFilterId)
      ? categoryFilterId
      : null

  const canRecordExpense = canRecordExpensePermission && canWrite
  const canRecordCheckpoint = canRecordCheckpointPermission && canWrite
  const canRecordOpeningBalance = canRecordOpeningBalancePermission && hasSeason

  // Without a current season no correction control is offered either (§7).
  const canUpdateExpense = canUpdateExpensePermission && canWrite
  const canUpdateOpeningBalance = canUpdateOpeningBalancePermission && hasSeason
  const canUpdateCheckpoint = canUpdateCheckpointPermission && canWrite

  // One sheet, two modes: first entry (balance missing, 'opening_balance:record')
  // or correction (balance entered, 'opening_balance:update'). The existing
  // amount is null while the balance is missing.
  const selectedCarrier =
    openingBalanceCarrierId !== null ? (snapshot?.carriers.find((carrier) => carrier.id === openingBalanceCarrierId) ?? null) : null
  const openingBalanceCarrier =
    selectedCarrier !== null &&
    ((selectedCarrier.openingBalanceCents === null && canRecordOpeningBalance) ||
      (selectedCarrier.openingBalanceCents !== null && canUpdateOpeningBalance))
      ? selectedCarrier
      : null

  // A sheet whose row left the snapshot (deleted elsewhere) is simply not
  // rendered. An expense of an archived carrier is fully locked (PO-FA-13): it
  // never opens the correction wizard.
  const editingCandidate =
    canUpdateExpense && editingExpenseId !== null ? (snapshot?.expenses.find((e) => e.id === editingExpenseId) ?? null) : null
  const editingCarrierId = editingCandidate ? expenseCarrierId(editingCandidate) : null
  const editingExpense =
    editingCandidate !== null &&
    (editingCarrierId === null || !isCarrierArchived(snapshot?.carriers.find((c) => c.id === editingCarrierId) ?? { archivedAt: null }))
      ? editingCandidate
      : null
  const editingCheckpoint =
    canUpdateCheckpoint && editingCheckpointId !== null ? (snapshot?.checkpoints.find((c) => c.id === editingCheckpointId) ?? null) : null

  // "Marquer remboursée" — only for the treasurer in treasurer view, on an
  // advance still listed by the snapshot (any season). Without a season the
  // action stays available (the block is shown under the state message).
  const reimbursingAdvance =
    canUpdateReimbursementPermission && reimbursingAdvanceId !== null
      ? (snapshot?.outstandingAdvances.find((advance) => advance.id === reimbursingAdvanceId) ?? null)
      : null
  const reimbursingMemberName = reimbursingAdvance && snapshot ? (accountNames(snapshot).get(reimbursingAdvance.advancedByUserId) ?? 'Membre') : ''

  // Closing a correction sheet re-reads the snapshot: it may have been left open
  // on a "n'existe plus" message (§2).
  const refreshAfterCorrection = () => void queryClient.invalidateQueries({ queryKey: queryKeys.financesRoot() })

  return {
    canViewFinances,
    canRecordExpense,
    canRecordOpeningBalance,
    canRecordCheckpoint,
    canUpdateExpense,
    canDeleteExpense: canDeleteExpensePermission && canWrite,
    canRenameCategory: canRenameCategoryPermission && canWrite,
    canDeleteCategory: canDeleteCategoryPermission && canWrite,
    canUpdateOpeningBalance,
    canUpdateCheckpoint,
    canDeleteCheckpoint: canDeleteCheckpointPermission && canWrite,
    canUpdateReimbursement: canUpdateReimbursementPermission,

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
    // specs/finances-member-advances.md A6 — null = nothing owed.
    owedView: snapshot ? toOwedBlockView(snapshot) : null,

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

    editingExpense,
    openExpenseEditSheet: (expenseId: string) => setEditingExpenseId(expenseId),
    closeExpenseEditSheet: () => {
      setEditingExpenseId(null)
      refreshAfterCorrection()
    },

    editingCheckpoint,
    openCheckpointEditSheet: (checkpointId: string) => setEditingCheckpointId(checkpointId),
    closeCheckpointEditSheet: () => {
      setEditingCheckpointId(null)
      refreshAfterCorrection()
    },

    reimbursingAdvance,
    reimbursingMemberName,
    openReimbursementSheet: (advanceId: string) => setReimbursingAdvanceId(advanceId),
    closeReimbursementSheet: () => {
      setReimbursingAdvanceId(null)
      refreshAfterCorrection()
    },

    openingBalanceCarrier,
    openingBalanceExistingCents: openingBalanceCarrier?.openingBalanceCents ?? null,
    openOpeningBalanceSheet: (carrierId: string) => setOpeningBalanceCarrierId(carrierId),
    closeOpeningBalanceSheet: () => {
      setOpeningBalanceCarrierId(null)
      refreshAfterCorrection()
    },
  }
}
