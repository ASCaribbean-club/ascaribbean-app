import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FinancesSnapshot } from '@domain/entities/finance'
import { validateMoneyInput } from '@domain/rules/finance-form-rules'
import { useFinancesDependencies } from '@presentation/di/hooks/use-finances-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { eurosToCents } from '@presentation/shared/formatters/currency'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'
import { AMOUNT_MESSAGES } from './useExpenseSheetViewModel'

interface Params {
  snapshot: FinancesSnapshot
  carrierId: string
  carrierName: string
  onRecorded: () => void
}

// specs/mob-treasurer-finances.md §6 (AC-FI-28..30) — one amount, ≥ 0, entered
// ONCE per (carrier, season). RecordOpeningBalanceUseCase is the authority
// ('opening_balance:record' + audit 'opening_balance.recorded').
export function useOpeningBalanceSheetViewModel({ snapshot, carrierId, carrierName, onRecorded }: Params) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { recordOpeningBalanceUseCase } = useFinancesDependencies()
  const [amountEuros, setAmountEuros] = useState('')

  const seasonId = snapshot.season?.id ?? null
  const amountError = validateMoneyInput(amountEuros, true)

  const mutation = useMutation({
    mutationFn: () => {
      if (!user || !seasonId) throw new Error('No authenticated session or season.')
      return recordOpeningBalanceUseCase.execute({
        actorId: user.id,
        carrierId,
        seasonId,
        amountCents: eurosToCents(Number(amountEuros.trim().replace(',', '.'))),
      })
    },
    onSuccess: () => {
      // AC-FI-30 — balance, available and kind breakdown derive from the snapshot.
      void queryClient.invalidateQueries({ queryKey: queryKeys.financesRoot() })
      onRecorded()
    },
  })

  const canSubmit = amountError === null && seasonId !== null && !mutation.isPending

  return {
    recapLabel: `${carrierName} · Saison ${snapshot.season?.label ?? ''}`,
    amountEuros,
    setAmountEuros,
    amountHint: amountEuros !== '' && amountError ? AMOUNT_MESSAGES[amountError] : null,
    isDirty: amountEuros !== '',
    canSubmit,
    isSubmitting: mutation.isPending,
    errorMessage: mutation.error ? mapDomainErrorToUiError(mutation.error).message : null,
    submit: () => {
      if (!canSubmit) return
      mutation.mutate()
    },
  }
}
