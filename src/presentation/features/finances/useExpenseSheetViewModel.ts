import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { EXPENSE_PAYMENT_METHODS, type ExpensePaymentMethod } from '@domain/entities/expense-payment-method'
import type { ExpenseCategory, FinancesSnapshot } from '@domain/entities/finance'
import {
  MAX_CATEGORY_LABEL_LENGTH,
  MAX_EXPENSE_LABEL_LENGTH,
  validateCategoryLabel,
  validateExpenseDate,
  validateExpenseLabel,
  validateMoneyInput,
  type CategoryLabelError,
  type ExpenseDateError,
  type MoneyInputError,
} from '@domain/rules/finance-form-rules'
import { useFinancesDependencies } from '@presentation/di/hooks/use-finances-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { eurosToCents } from '@presentation/shared/formatters/currency'
import { formatExpensePaymentMethod } from '@presentation/shared/formatters/expense-payment-method-labels'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

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

const CATEGORY_MESSAGES: Record<CategoryLabelError, string> = {
  required: 'Saisissez le nom de la catégorie.',
  'too-long': `Le nom ne peut dépasser ${MAX_CATEGORY_LABEL_LENGTH} caractères.`,
  duplicate: 'Une catégorie portant ce nom existe déjà.',
}

interface Params {
  snapshot: FinancesSnapshot
  today: string
  onRecorded: () => void
}

// specs/mob-treasurer-finances.md §4 (maquettes 5/6) — "Nouvelle dépense".
// RecordExpenseUseCase is the authority (validation, 'expense:record', audit);
// the field rules below are the same pure rules, used for field messages and
// the enabled state of the submit button (AC-FI-10). Audit is never emitted
// from here.
export function useExpenseSheetViewModel({ snapshot, today, onRecorded }: Params) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { recordExpenseUseCase, createExpenseCategoryUseCase } = useFinancesDependencies()

  const season = snapshot.season
  const [amountEuros, setAmountEuros] = useState('')
  const [label, setLabel] = useState('')
  const [spentOn, setSpentOn] = useState(today)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [carrierId, setCarrierId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod | null>(null)

  // Categories created from this sheet, shown before the snapshot refetches.
  const [createdCategories, setCreatedCategories] = useState<ExpenseCategory[]>([])
  const categories = [...snapshot.categories, ...createdCategories.filter((created) => !snapshot.categories.some((c) => c.id === created.id))]

  const [isNewCategoryOpen, setIsNewCategoryOpen] = useState(false)
  const [newCategoryLabel, setNewCategoryLabel] = useState('')
  const [newCategoryError, setNewCategoryError] = useState<string | null>(null)

  const amountError = validateMoneyInput(amountEuros, false)
  const labelError = validateExpenseLabel(label)
  const dateError = season ? validateExpenseDate(spentOn, today, season.startDate) : 'required'
  const isValid =
    amountError === null && labelError === null && dateError === null && categoryId !== null && carrierId !== null && paymentMethod !== null

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('No authenticated session.')
      if (!season || !categoryId || !carrierId || !paymentMethod) throw new Error('Incomplete expense form.')
      return recordExpenseUseCase.execute({
        actorId: user.id,
        seasonId: season.id,
        seasonStartDate: season.startDate,
        today,
        amountCents: eurosToCents(Number(amountEuros.trim().replace(',', '.'))),
        label,
        spentOn,
        categoryId,
        carrierId,
        paymentMethod,
      })
    },
    onSuccess: () => {
      // AC-FI-11 — centralised keys: list, summary card, month, breakdown,
      // outflows, available balance and the carrier's balance all derive from
      // the one snapshot.
      void queryClient.invalidateQueries({ queryKey: queryKeys.financesRoot() })
      onRecorded()
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

  const isDirty = amountEuros !== '' || label !== '' || categoryId !== null || carrierId !== null || paymentMethod !== null

  return {
    seasonLabel: season?.label ?? '',
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

    categoryOptions: categories.map((category) => ({ id: category.id, label: category.label, colorIndex: category.colorIndex })),
    categoryId,
    selectCategory: setCategoryId,
    carrierOptions: snapshot.carriers.map((carrier) => ({ id: carrier.id, label: carrier.label })),
    carrierId,
    selectCarrier: setCarrierId,
    methodOptions: EXPENSE_PAYMENT_METHODS.map((method) => ({ id: method, label: formatExpensePaymentMethod(method) })),
    paymentMethod,
    selectPaymentMethod: (id: string) => setPaymentMethod(id as ExpensePaymentMethod),

    // "+ Nouvelle" — AC-FI-13.
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

    isDirty,
    canSubmit: isValid && !mutation.isPending,
    isSubmitting: mutation.isPending,
    errorMessage: mutation.error ? mapDomainErrorToUiError(mutation.error).message : null,
    // A double tap never records twice (AC-FI-12).
    submit: () => {
      if (!isValid || mutation.isPending) return
      mutation.mutate()
    },
  }
}
