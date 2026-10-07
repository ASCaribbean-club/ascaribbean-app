import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FinancesSnapshot } from '@domain/entities/finance'
import { validateMoneyInput } from '@domain/rules/finance-form-rules'
import { useFinancesDependencies } from '@presentation/di/hooks/use-finances-dependencies'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'
import { amountInputToCents, centsToAmountInput } from './amount-input'
import { financeCorrectionErrorMessage } from './finance-error-messages'
import { AMOUNT_MESSAGES } from './useExpenseSheetViewModel'

interface Params {
  snapshot: FinancesSnapshot
  carrierId: string
  carrierName: string
  // Present = CORRECTION mode (specs/mob-treasurer-finances-edit.md §5): the
  // balance already entered, prefilled; an UPDATE of the existing row.
  existingCents?: number
  onRecorded: () => void
}

// specs/mob-treasurer-finances.md §6 (AC-FI-28..30) — one amount, ≥ 0, per
// (carrier, season). RecordOpeningBalanceUseCase is the authority for the
// first entry ('opening_balance:record' + audit 'opening_balance.recorded');
// UpdateOpeningBalanceUseCase for its correction ('opening_balance:update' +
// 'opening_balance.updated', specs/mob-treasurer-finances-edit.md AC-FIE-10).
export function useOpeningBalanceSheetViewModel({ snapshot, carrierId, carrierName, existingCents, onRecorded }: Params) {
  const isEditing = existingCents !== undefined
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { recordOpeningBalanceUseCase, updateOpeningBalanceUseCase } = useFinancesDependencies()
  const [amountEuros, setAmountEuros] = useState(existingCents !== undefined ? centsToAmountInput(existingCents) : '')

  const seasonId = snapshot.season?.id ?? null
  const amountError = validateMoneyInput(amountEuros, true)

  const mutation = useMutation({
    mutationFn: () => {
      if (!user || !seasonId) throw new Error('No authenticated session or season.')
      const request = { actorId: user.id, carrierId, seasonId, amountCents: amountInputToCents(amountEuros) }
      return isEditing ? updateOpeningBalanceUseCase.execute(request) : recordOpeningBalanceUseCase.execute(request)
    },
    onSuccess: () => {
      // AC-FI-30 — balance, available and kind breakdown derive from the snapshot.
      void queryClient.invalidateQueries({ queryKey: queryKeys.financesRoot() })
      onRecorded()
    },
  })

  // Inactive while invalid or equal to the current balance (AC-FIE-05 pattern).
  const isUnchanged = isEditing && amountError === null && amountInputToCents(amountEuros) === existingCents
  const canSubmit = amountError === null && seasonId !== null && !isUnchanged && !mutation.isPending

  return {
    isEditing,
    title: isEditing ? 'Corriger le solde d\'ouverture' : 'Solde d\'ouverture',
    submitLabel: isEditing ? 'Enregistrer la correction' : 'Enregistrer le solde d\'ouverture',
    recapLabel: `${carrierName} · Saison ${snapshot.season?.label ?? ''}`,
    amountEuros,
    setAmountEuros,
    amountHint: amountEuros !== '' && amountError ? AMOUNT_MESSAGES[amountError] : null,
    isDirty: isEditing ? !isUnchanged : amountEuros !== '',
    canSubmit,
    isSubmitting: mutation.isPending,
    errorMessage: mutation.error ? financeCorrectionErrorMessage(mutation.error) : null,
    submit: () => {
      if (!canSubmit) return
      mutation.mutate()
    },
  }
}
