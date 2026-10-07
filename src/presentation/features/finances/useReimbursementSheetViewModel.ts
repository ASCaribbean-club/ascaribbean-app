import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { EXPENSE_PAYMENT_METHODS, type ExpensePaymentMethod } from '@domain/entities/expense-payment-method'
import type { OutstandingAdvance } from '@domain/entities/finance'
import { ExpenseNotReimbursableError } from '@domain/errors/expense-not-reimbursable-error'
import { validateReimbursementDate } from '@domain/rules/finance-form-rules'
import { useFinancesDependencies } from '@presentation/di/hooks/use-finances-dependencies'
import { EXPENSE_NOT_REIMBURSABLE_MESSAGE } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { formatShortDate } from '@presentation/shared/formatters/club-date'
import { formatExpensePaymentMethod } from '@presentation/shared/formatters/expense-payment-method-labels'
import { formatFinanceAmount } from '@presentation/shared/formatters/finance-amounts'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'
import { financeCorrectionErrorMessage } from './finance-error-messages'
import { REIMBURSEMENT_DATE_MESSAGES } from './useExpenseSheetViewModel'

interface Params {
  advance: OutstandingAdvance
  memberName: string
  // yyyy-mm-dd in the club timezone.
  today: string
  onClose: () => void
}

// specs/finances-member-advances.md §2.7/A6/AC-FA-33..36 — "Marquer remboursée":
// ONE step (date + method of the reimbursement), for an advance of ANY season.
// SetExpenseReimbursementUseCase is the authority (right, validation, audit);
// the pure rule below only drives the field message and the enabled state. No
// carrier balance moves (PO-FA-18, open) and the interface says nothing about it.
export function useReimbursementSheetViewModel({ advance, memberName, today, onClose }: Params) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { setExpenseReimbursementUseCase } = useFinancesDependencies()

  const [reimbursedOn, setReimbursedOn] = useState(today)
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod | null>(null)

  const dateError = validateReimbursementDate(reimbursedOn, today, advance.spentOn)

  const mutation = useMutation({
    mutationFn: () => {
      if (!user || !paymentMethod) throw new Error('No authenticated session or payment method.')
      return setExpenseReimbursementUseCase.execute({
        actorId: user.id,
        expenseId: advance.id,
        today,
        reimbursement: { reimbursedOn, paymentMethod },
      })
    },
    onSuccess: () => {
      // AC-FA-34 — the advance leaves "À rembourser", totals and the line follow.
      void queryClient.invalidateQueries({ queryKey: queryKeys.financesRoot() })
      onClose()
    },
  })

  const isGone = mutation.error instanceof ExpenseNotReimbursableError
  const canSubmit = dateError === null && paymentMethod !== null && !mutation.isPending

  return {
    title: 'Marquer remboursée',
    description: `${memberName} · ${advance.label} · ${formatFinanceAmount(advance.amountCents)} · ${formatShortDate(advance.spentOn)}`,
    reimbursedOn,
    setReimbursedOn,
    minReimbursedOn: advance.spentOn,
    maxReimbursedOn: today,
    dateMessage: dateError ? REIMBURSEMENT_DATE_MESSAGES[dateError] : null,
    methodOptions: EXPENSE_PAYMENT_METHODS.map((method) => ({ id: method, label: formatExpensePaymentMethod(method) })),
    paymentMethod,
    selectPaymentMethod: (id: string) => setPaymentMethod(id as ExpensePaymentMethod),
    canSubmit,
    isSubmitting: mutation.isPending,
    // The advance is gone / no longer to reimburse: the sheet closes on
    // acknowledgment and the block reloads (the page refetches on close).
    isGone,
    errorMessage: mutation.error ? (isGone ? EXPENSE_NOT_REIMBURSABLE_MESSAGE : financeCorrectionErrorMessage(mutation.error)) : null,
    // A double tap never writes twice (AC-FA-36).
    submit: () => {
      if (!canSubmit) return
      mutation.mutate()
    },
  }
}
