import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ExpenseCategory } from '@domain/entities/finance'
import { MAX_CATEGORY_LABEL_LENGTH, validateCategoryRename, type CategoryLabelError } from '@domain/rules/finance-form-rules'
import { useFinancesDependencies } from '@presentation/di/hooks/use-finances-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

const CATEGORY_MESSAGES: Record<CategoryLabelError, string> = {
  required: 'Saisissez le nom de la catégorie.',
  'too-long': `Le nom ne peut dépasser ${MAX_CATEGORY_LABEL_LENGTH} caractères.`,
  duplicate: 'Une catégorie portant ce nom existe déjà.',
}

interface Params {
  categories: ExpenseCategory[]
  // The currently selected category of the expense sheet: the only one that can
  // be edited (O-FIE-UI-01), and only when a pencil is rendered for it.
  selectedCategoryId: string | null
  usedCategoryIds: string[]
  canRename: boolean
  canDelete: boolean
  // The edited category was deleted: the sheet clears its selection.
  onDeleted: (categoryId: string) => void
}

// specs/mob-treasurer-finances-edit.md §4 (PO-FIE-11, O-FIE-UI-01) — rename /
// delete a category from the expense sheet. The use cases are the authority
// (rights, validation, audit); the rules below only drive the field message.
export function useCategoryEditViewModel({ categories, selectedCategoryId, usedCategoryIds, canRename, canDelete, onDeleted }: Params) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { renameExpenseCategoryUseCase, deleteExpenseCategoryUseCase } = useFinancesDependencies()

  const [isOpen, setIsOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  const category = categories.find((candidate) => candidate.id === selectedCategoryId) ?? null
  // Deletable only when NO expense references it, all seasons (AC-FIE-09).
  const isUnused = category !== null && !usedCategoryIds.includes(category.id)

  const close = () => {
    setIsOpen(false)
    setLabel('')
    setError(null)
    setIsConfirmingDelete(false)
  }

  const renameMutation = useMutation({
    mutationFn: () => {
      if (!user || !category) throw new Error('No authenticated session or category.')
      return renameExpenseCategoryUseCase.execute({ actorId: user.id, categoryId: category.id, label })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.financesRoot() })
      close()
    },
    onError: (mutationError) => setError(mapDomainErrorToUiError(mutationError).message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!user || !category) throw new Error('No authenticated session or category.')
      return deleteExpenseCategoryUseCase.execute({ actorId: user.id, categoryId: category.id })
    },
    onSuccess: () => {
      const deletedId = category?.id
      void queryClient.invalidateQueries({ queryKey: queryKeys.financesRoot() })
      close()
      if (deletedId) onDeleted(deletedId)
    },
    onError: (mutationError) => {
      setIsConfirmingDelete(false)
      setError(mapDomainErrorToUiError(mutationError).message)
    },
  })

  const isBusy = renameMutation.isPending || deleteMutation.isPending

  return {
    // The pencil: rendered only on the selected chip, only with the right.
    pencilCategoryId: canRename && category !== null ? category.id : null,
    pencilLabel: category ? `Modifier la catégorie ${category.label}` : '',
    isOpen: canRename && category !== null && isOpen,
    open: () => {
      if (!category) return
      setLabel(category.label)
      setError(null)
      setIsConfirmingDelete(false)
      setIsOpen(true)
    },
    cancel: close,

    label,
    setLabel: (value: string) => {
      setLabel(value)
      setError(null)
    },
    maxLength: MAX_CATEGORY_LABEL_LENGTH,
    error,
    isBusy,
    isRenaming: renameMutation.isPending,
    submit: () => {
      if (!category || isBusy) return
      const ruleError = validateCategoryRename(label, category.id, categories)
      if (ruleError) {
        setError(CATEGORY_MESSAGES[ruleError])
        return
      }
      renameMutation.mutate()
    },

    // "Supprimer la catégorie" only when allowed AND unused: absent, never greyed.
    canDelete: canDelete && isUnused,
    isConfirmingDelete,
    deleteConfirmMessage: category ? `Supprimer la catégorie « ${category.label} » ? Cette action est définitive.` : '',
    requestDelete: () => setIsConfirmingDelete(true),
    cancelDelete: () => setIsConfirmingDelete(false),
    confirmDelete: () => {
      if (isBusy) return
      deleteMutation.mutate()
    },
    isDeleting: deleteMutation.isPending,
  }
}
