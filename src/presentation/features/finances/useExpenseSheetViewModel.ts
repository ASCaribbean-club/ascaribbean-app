import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { EXPENSE_PAYMENT_METHODS, type ExpensePaymentMethod } from '@domain/entities/expense-payment-method'
import type { Expense, ExpenseCategory, ExpensePayer, FinancesSnapshot } from '@domain/entities/finance'
import {
  MAX_CATEGORY_LABEL_LENGTH,
  hasExpenseChanged,
  MAX_EXPENSE_LABEL_LENGTH,
  validateCategoryLabel,
  validateExpenseDate,
  validateExpenseLabel,
  validateExpensePayer,
  validateMoneyInput,
  validateReimbursementDate,
  type CategoryLabelError,
  type ExpenseDateError,
  type MoneyInputError,
  type ReimbursementDateError,
} from '@domain/rules/finance-form-rules'
import { activeCarriers } from '@domain/rules/finance-rules'
import { useFinancesDependencies } from '@presentation/di/hooks/use-finances-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { formatWeekdayDate } from '@presentation/shared/formatters/club-date'
import { formatFinanceAmount } from '@presentation/shared/formatters/finance-amounts'
import { formatExpensePaymentMethod } from '@presentation/shared/formatters/expense-payment-method-labels'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'
import { amountInputToCents, centsToAmountInput } from './amount-input'
import { financeCorrectionErrorMessage } from './finance-error-messages'
import { accountNames } from './finances-view'
import { filterAccounts } from './member-search'
import { useCategoryEditViewModel } from './useCategoryEditViewModel'

export const AMOUNT_MESSAGES: Record<MoneyInputError, string> = {
  required: 'Saisissez un montant.',
  'not-positive': 'Le montant doit être supérieur à 0.',
  negative: 'Le montant ne peut pas être négatif.',
  'too-many-decimals': 'Le montant ne peut avoir plus de 2 décimales.',
  invalid: 'Montant invalide.',
}

const DATE_MESSAGES: Record<ExpenseDateError, string> = {
  required: 'Saisissez la date de la dépense.',
  'in-future': 'La date ne peut pas être dans le futur.',
  'before-season': 'La date doit être dans la saison en cours.',
}

// specs/finances-member-advances.md A2/A6 — shared with the "Marquer remboursée" sheet.
export const REIMBURSEMENT_DATE_MESSAGES: Record<ReimbursementDateError, string> = {
  required: 'Saisissez la date du remboursement.',
  'in-future': 'La date ne peut pas être dans le futur.',
  'before-expense': 'La date ne peut pas précéder celle de la dépense.',
}

const CATEGORY_MESSAGES: Record<CategoryLabelError, string> = {
  required: 'Saisissez le nom de la catégorie.',
  'too-long': `Le nom ne peut dépasser ${MAX_CATEGORY_LABEL_LENGTH} caractères.`,
  duplicate: 'Une catégorie portant ce nom existe déjà.',
}

// specs/finances-member-advances.md D-A7/A1 — the four steps of the wizard.
export const EXPENSE_STEPS = [
  { id: 'amount', label: 'Montant' },
  { id: 'category', label: 'Catégorie' },
  { id: 'payment', label: 'Paiement' },
  { id: 'recap', label: 'Récap' },
] as const

export type ExpenseStepId = (typeof EXPENSE_STEPS)[number]['id']
const LAST_STEP_INDEX = EXPENSE_STEPS.length - 1

interface Params {
  snapshot: FinancesSnapshot
  today: string
  // Present = CORRECTION mode (specs/mob-treasurer-finances-edit.md §3): the
  // same wizard, prefilled, opening on the recap (UI-FA-03).
  expense?: Expense
  // Each flag = can(action) && isTreasurerView, computed by useFinancesViewModel.
  canDeleteExpense: boolean
  canRenameCategory: boolean
  canDeleteCategory: boolean
  onRecorded: () => void
}

// specs/mob-treasurer-finances.md §4 — "Nouvelle dépense", specs/mob-treasurer-
// finances-edit.md §3 — "Modifier la dépense", and specs/finances-member-
// advances.md D-A7 — both are the SAME four-step wizard (Montant, Catégorie,
// Paiement, Récap). RecordExpenseUseCase / UpdateExpenseUseCase /
// DeleteExpenseUseCase are the authority (validation, rights, audit); the field
// rules below are the same pure rules, used for field messages and the validity
// of each step (AC-FA-27). No new domain rule lives here. Audit is never
// emitted from here.
export function useExpenseSheetViewModel({
  snapshot,
  today,
  expense,
  canDeleteExpense,
  canRenameCategory,
  canDeleteCategory,
  onRecorded,
}: Params) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { recordExpenseUseCase, updateExpenseUseCase, deleteExpenseUseCase, createExpenseCategoryUseCase } = useFinancesDependencies()
  const isEditing = expense !== undefined

  const season = snapshot.season
  const initialPayer = expense?.payer
  const [stepIndex, setStepIndex] = useState(isEditing ? LAST_STEP_INDEX : 0)
  const [amountEuros, setAmountEuros] = useState(expense ? centsToAmountInput(expense.amountCents) : '')
  const [label, setLabel] = useState(expense?.label ?? '')
  const [spentOn, setSpentOn] = useState(expense?.spentOn ?? today)
  const [categoryId, setCategoryId] = useState<string | null>(expense?.categoryId ?? null)
  // Payment step. Every choice is kept in memory for the life of the sheet, so
  // flipping "Avancé par un membre ?" or "Remboursé" back and forth loses
  // nothing; only what the CURRENT choice needs is ever sent (A2 "Bascules").
  const [isAdvance, setIsAdvance] = useState(initialPayer?.kind === 'member')
  const [carrierId, setCarrierId] = useState<string | null>(initialPayer?.kind === 'carrier' ? initialPayer.carrierId : null)
  const [carrierMethod, setCarrierMethod] = useState<ExpensePaymentMethod | null>(
    initialPayer?.kind === 'carrier' ? initialPayer.paymentMethod : null,
  )
  const [memberId, setMemberId] = useState<string | null>(initialPayer?.kind === 'member' ? initialPayer.userId : null)
  const [memberQuery, setMemberQuery] = useState('')
  const [isReimbursed, setIsReimbursed] = useState(initialPayer?.kind === 'member' && initialPayer.reimbursement !== null)
  const [reimbursedOn, setReimbursedOn] = useState(
    initialPayer?.kind === 'member' && initialPayer.reimbursement ? initialPayer.reimbursement.reimbursedOn : today,
  )
  const [reimbursementMethod, setReimbursementMethod] = useState<ExpensePaymentMethod | null>(
    initialPayer?.kind === 'member' && initialPayer.reimbursement ? initialPayer.reimbursement.paymentMethod : null,
  )
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  // Categories created from this sheet, shown before the snapshot refetches.
  const [createdCategories, setCreatedCategories] = useState<ExpenseCategory[]>([])
  const categories = [...snapshot.categories, ...createdCategories.filter((created) => !snapshot.categories.some((c) => c.id === created.id))]

  const [isNewCategoryOpen, setIsNewCategoryOpen] = useState(false)
  const [newCategoryLabel, setNewCategoryLabel] = useState('')
  const [newCategoryError, setNewCategoryError] = useState<string | null>(null)

  // --- Payer: the list of accounts (D-A6) and the active carriers (D-B1) -----
  const names = accountNames(snapshot)
  // The directory of the treasurer; the member already holding THIS expense is
  // added for display even if absent from it (A3 "Correction").
  const accounts = [...snapshot.advanceCandidates]
  if (initialPayer?.kind === 'member' && !accounts.some((account) => account.userId === initialPayer.userId)) {
    accounts.push({ userId: initialPayer.userId, displayName: names.get(initialPayer.userId) ?? 'Membre' })
  }
  const carriers = activeCarriers(snapshot.carriers)
  // A2: the question is absent when there is no account to pick and the expense
  // is not already an advance.
  const canChooseMember = accounts.length > 0 || initialPayer?.kind === 'member'
  const selectedMemberName = memberId ? (accounts.find((account) => account.userId === memberId)?.displayName ?? '') : ''
  const memberOptions = filterAccounts(accounts, memberQuery)

  const payer: ExpensePayer | null = isAdvance
    ? memberId === null
      ? null
      : { kind: 'member', userId: memberId, reimbursement: isReimbursed ? (reimbursementMethod ? { reimbursedOn, paymentMethod: reimbursementMethod } : null) : null }
    : carrierId !== null && carrierMethod !== null
      ? { kind: 'carrier', carrierId, paymentMethod: carrierMethod }
      : null
  // "Remboursé" without its method is an incomplete payer, not a to-reimburse one.
  const isPayerComplete = payer !== null && !(isAdvance && isReimbursed && reimbursementMethod === null)
  const payerChoices = { activeCarrierIds: carriers.map((carrier) => carrier.id), memberUserIds: accounts.map((account) => account.userId) }

  const amountError = validateMoneyInput(amountEuros, false)
  const labelError = validateExpenseLabel(label)
  const dateError = season ? validateExpenseDate(spentOn, today, season.startDate) : 'required'
  const reimbursementDateError = isAdvance && isReimbursed ? validateReimbursementDate(reimbursedOn, today, spentOn) : null
  const payerError = payer !== null && isPayerComplete ? validateExpensePayer(payer, spentOn, today, payerChoices) : 'incomplete'

  // Validity of each step, derived from the pure rules (AC-FA-27).
  const stepValidity = [
    amountError === null && labelError === null && dateError === null,
    categoryId !== null,
    isPayerComplete && payerError === null,
    true,
  ]
  const isValid = stepValidity.every(Boolean)
  const firstInvalidIndex = stepValidity.findIndex((valid) => !valid)
  // One cannot jump past the first invalid step (creation); in correction every
  // step is reachable (UI-FA-03).
  const reachableLimit = firstInvalidIndex === -1 ? LAST_STEP_INDEX : firstInvalidIndex

  // "Enregistrer" stays inactive while the form equals the reference (AC-FIE-05).
  const isUnchanged =
    expense !== undefined &&
    isValid &&
    categoryId !== null &&
    payer !== null &&
    !hasExpenseChanged(expense, { amountCents: amountInputToCents(amountEuros), label, spentOn, categoryId, payer })

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('No authenticated session.')
      if (!season || !categoryId || !payer) throw new Error('Incomplete expense form.')
      if (expense) {
        return updateExpenseUseCase.execute({
          actorId: user.id,
          expenseId: expense.id,
          seasonStartDate: season.startDate,
          today,
          amountCents: amountInputToCents(amountEuros),
          label,
          spentOn,
          categoryId,
          payer,
          payerChoices,
        })
      }
      return recordExpenseUseCase.execute({
        actorId: user.id,
        seasonId: season.id,
        seasonStartDate: season.startDate,
        today,
        amountCents: amountInputToCents(amountEuros),
        label,
        spentOn,
        categoryId,
        payer,
        payerChoices,
      })
    },
    onSuccess: () => {
      // AC-FI-11 / AC-FA-07 — centralised keys: list, summary card, month,
      // breakdown, outflows, available balance, the carrier's balance and the
      // "À rembourser" block all derive from the one snapshot.
      void queryClient.invalidateQueries({ queryKey: queryKeys.financesRoot() })
      onRecorded()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!user || !expense) throw new Error('No authenticated session or expense.')
      return deleteExpenseUseCase.execute({ actorId: user.id, expenseId: expense.id })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.financesRoot() })
      onRecorded()
    },
    onError: () => {
      // The panel gives way to the action bar again; the error shows above it.
      // No refetch here: the edited row could vanish from the snapshot and take
      // the sheet (and its message) with it. The page refetches on close.
      setIsConfirmingDelete(false)
    },
  })

  const categoryMutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('No authenticated session.')
      return createExpenseCategoryUseCase.execute({ actorId: user.id, label: newCategoryLabel })
    },
    onSuccess: (category) => {
      setCreatedCategories((current) => [...current, category])
      setCategoryId(category.id)
      setIsNewCategoryOpen(false)
      setNewCategoryLabel('')
      setNewCategoryError(null)
      void queryClient.invalidateQueries({ queryKey: queryKeys.financesRoot() })
    },
    onError: (error) => setNewCategoryError(mapDomainErrorToUiError(error).message),
  })

  const categoryEdit = useCategoryEditViewModel({
    categories,
    selectedCategoryId: categoryId,
    usedCategoryIds: snapshot.usedCategoryIds,
    canRename: canRenameCategory,
    canDelete: canDeleteCategory,
    onDeleted: (deletedId) => {
      // The selection is emptied: the form is invalid until a category is chosen.
      setCategoryId((current) => (current === deletedId ? null : current))
    },
  })

  // An outside tap closes a pristine sheet only; in correction mode "dirty"
  // means "differs from the reference".
  const isDirty = expense
    ? !isUnchanged
    : amountEuros !== '' || label !== '' || categoryId !== null || carrierId !== null || carrierMethod !== null || memberId !== null

  const mutationError = mutation.error ?? deleteMutation.error
  const isBusy = mutation.isPending || deleteMutation.isPending
  const categoryLabel = categories.find((category) => category.id === categoryId)?.label ?? ''
  const carrierLabel = carriers.find((carrier) => carrier.id === carrierId)?.label ?? ''

  // Recap rows (A2 step 4): the payer as carrier + method, or member + state.
  const recapRows: { label: string; value: string }[] = [
    { label: 'Montant', value: amountError === null ? formatFinanceAmount(amountInputToCents(amountEuros)) : '' },
    { label: 'Libellé', value: label.trim() },
    { label: 'Date', value: formatWeekdayDate(spentOn) },
    { label: 'Catégorie', value: categoryLabel },
    ...(isAdvance
      ? [
          { label: 'Avancé par', value: selectedMemberName },
          ...(isReimbursed
            ? [
                { label: 'Remboursé le', value: formatWeekdayDate(reimbursedOn) },
                { label: 'Mode de remboursement', value: reimbursementMethod ? formatExpensePaymentMethod(reimbursementMethod) : '' },
              ]
            : [{ label: 'Remboursement', value: 'À rembourser' }]),
        ]
      : [{ label: 'Payé depuis', value: `${carrierLabel} · ${carrierMethod ? formatExpensePaymentMethod(carrierMethod) : ''}` }]),
  ]

  const isLastStep = stepIndex === LAST_STEP_INDEX
  const canGoNext = !isLastStep && stepValidity[stepIndex] && !isBusy
  const methodOptions = EXPENSE_PAYMENT_METHODS.map((method) => ({ id: method, label: formatExpensePaymentMethod(method) }))

  return {
    isEditing,
    title: isEditing ? 'Modifier la dépense' : 'Nouvelle dépense',
    submitLabel: isEditing ? 'Enregistrer les modifications' : 'Enregistrer la dépense',
    seasonLabel: season?.label ?? '',

    // --- Wizard (AC-FA-27/28/30) ---
    steps: EXPENSE_STEPS.map((step, index) => ({
      id: step.id,
      label: step.label,
      isCurrent: index === stepIndex,
      // Reached steps are navigable; creation never jumps past the first invalid one.
      isReachable: !isBusy && (isEditing || index <= reachableLimit),
      srLabel: `Étape ${index + 1} sur ${EXPENSE_STEPS.length}`,
      onSelect: () => {
        if (isBusy || (!isEditing && index > reachableLimit)) return
        setStepIndex(index)
      },
    })),
    step: EXPENSE_STEPS[stepIndex].id,
    isFirstStep: stepIndex === 0,
    isLastStep,
    canGoNext,
    goNext: () => {
      if (canGoNext) setStepIndex((current) => current + 1)
    },
    // "Retour" never loses a value: every field lives in this hook, not in a step.
    goBack: () => setStepIndex((current) => Math.max(0, current - 1)),

    // --- Step 1 ---
    amountEuros,
    setAmountEuros,
    amountHint: amountEuros !== '' && amountError ? AMOUNT_MESSAGES[amountError] : null,
    label,
    setLabel,
    maxLabelLength: MAX_EXPENSE_LABEL_LENGTH,
    spentOn,
    setSpentOn,
    maxSpentOn: today,
    minSpentOn: season?.startDate ?? '',
    dateMessage: dateError ? DATE_MESSAGES[dateError] : null,

    // --- Step 2 ---
    categoryOptions: categories.map((category) => ({ id: category.id, label: category.label, colorIndex: category.colorIndex })),
    categoryId,
    selectCategory: setCategoryId,
    isNewCategoryOpen,
    openNewCategory: () => {
      setIsNewCategoryOpen(true)
      setNewCategoryError(null)
    },
    cancelNewCategory: () => {
      setIsNewCategoryOpen(false)
      setNewCategoryLabel('')
      setNewCategoryError(null)
    },
    newCategoryLabel,
    setNewCategoryLabel: (value: string) => {
      setNewCategoryLabel(value)
      setNewCategoryError(null)
    },
    maxCategoryLength: MAX_CATEGORY_LABEL_LENGTH,
    newCategoryError,
    isCreatingCategory: categoryMutation.isPending,
    submitNewCategory: () => {
      const error = validateCategoryLabel(newCategoryLabel, categories)
      if (error) {
        setNewCategoryError(CATEGORY_MESSAGES[error])
        return
      }
      if (categoryMutation.isPending) return
      categoryMutation.mutate()
    },
    categoryEdit,

    // --- Step 3 ---
    canChooseMember,
    isAdvance,
    // "Non" / "Oui" chips of "Avancé par un membre ?".
    advanceOptions: [
      { id: 'no', label: 'Non' },
      { id: 'yes', label: 'Oui' },
    ],
    selectAdvance: (id: string) => setIsAdvance(id === 'yes'),
    carrierOptions: carriers.map((carrier) => ({ id: carrier.id, label: carrier.label })),
    carrierId,
    selectCarrier: setCarrierId,
    methodOptions,
    paymentMethod: carrierMethod,
    selectPaymentMethod: (id: string) => setCarrierMethod(id as ExpensePaymentMethod),
    memberPicker: {
      query: memberId ? selectedMemberName : memberQuery,
      hasSelection: memberId !== null,
      selectedId: memberId,
      options: memberOptions.map((account) => ({ id: account.userId, name: account.displayName })),
      hasNoResult: memberId === null && memberOptions.length === 0,
      // Typing again after a choice CANCELS it: free text is never retained.
      onQueryChange: (value: string) => {
        setMemberId(null)
        setMemberQuery(value)
      },
      onSelect: (id: string) => setMemberId(id),
      onClear: () => {
        setMemberId(null)
        setMemberQuery('')
      },
    },
    reimbursementOptions: [
      { id: 'to-reimburse', label: 'À rembourser' },
      { id: 'reimbursed', label: 'Remboursé' },
    ],
    reimbursementChoice: isReimbursed ? 'reimbursed' : 'to-reimburse',
    selectReimbursement: (id: string) => setIsReimbursed(id === 'reimbursed'),
    isReimbursed,
    reimbursedOn,
    setReimbursedOn,
    minReimbursedOn: spentOn,
    maxReimbursedOn: today,
    reimbursementDateMessage: reimbursementDateError ? REIMBURSEMENT_DATE_MESSAGES[reimbursementDateError] : null,
    reimbursementMethod,
    selectReimbursementMethod: (id: string) => setReimbursementMethod(id as ExpensePaymentMethod),

    // --- Step 4 ---
    recapRows,

    isDirty,
    canSubmit: isValid && !isUnchanged && !isBusy,
    isSubmitting: mutation.isPending,
    errorMessage: mutationError ? financeCorrectionErrorMessage(mutationError) : null,
    // A double tap never records twice (AC-FI-12, AC-FA-28).
    submit: () => {
      if (!isValid || isUnchanged || isBusy) return
      mutation.mutate()
    },

    // "Supprimer la dépense" + in-place confirmation (AC-FIE-07, AC-FA-29):
    // absent unless editing AND canDeleteExpense; shown on the recap only.
    deletion:
      expense && canDeleteExpense
        ? {
            label: 'Supprimer la dépense',
            confirmMessage: `Supprimer cette dépense (${formatFinanceAmount(expense.amountCents)}, ${expense.label}) ? Cette action est définitive.`,
            isConfirming: isConfirmingDelete,
            isDeleting: deleteMutation.isPending,
            onRequest: () => {
              mutation.reset()
              deleteMutation.reset()
              setIsConfirmingDelete(true)
            },
            onConfirm: () => {
              if (deleteMutation.isPending) return
              deleteMutation.mutate()
            },
            onCancel: () => setIsConfirmingDelete(false),
          }
        : undefined,
  }
}

export type ExpenseSheetViewModel = ReturnType<typeof useExpenseSheetViewModel>
