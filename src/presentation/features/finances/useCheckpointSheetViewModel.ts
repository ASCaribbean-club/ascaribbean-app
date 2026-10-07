import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FinancesSnapshot } from '@domain/entities/finance'
import { MAX_DEBRIEF_LENGTH, validateDebrief, validateMoneyInput } from '@domain/rules/finance-form-rules'
import { varianceCents, summarizeTreasury } from '@domain/rules/finance-rules'
import { useFinancesDependencies } from '@presentation/di/hooks/use-finances-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { eurosToCents } from '@presentation/shared/formatters/currency'
import { formatFinanceAmount, formatSignedFinanceAmount } from '@presentation/shared/formatters/finance-amounts'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

interface Params {
  snapshot: FinancesSnapshot
  today: string
  onRecorded: () => void
}

function parseCents(text: string): number {
  return eurosToCents(Number(text.trim().replace(',', '.')))
}

// specs/mob-treasurer-finances.md §7 (AC-FI-18..20) — "Point de trésorerie".
// Fields start EMPTY with the theoretical amount as placeholder (O-FI-UI-01):
// saving is possible only once every carrier has been counted (a "0" is a
// valid count). The variance is the domain rule; the theoretical amounts
// stored with the point are computed by the SERVER (never sent from here).
export function useCheckpointSheetViewModel({ snapshot, today, onRecorded }: Params) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { recordTreasuryCheckpointUseCase } = useFinancesDependencies()

  const [counts, setCounts] = useState<Record<string, string>>({})
  const [debrief, setDebrief] = useState('')

  const rows = summarizeTreasury(snapshot).carriers.map(({ carrier, theoreticalCents, openingMissing }) => {
    const text = counts[carrier.id] ?? ''
    const isValid = validateMoneyInput(text, true) === null
    const variance = isValid ? varianceCents(parseCents(text), theoreticalCents) : null
    return {
      id: carrier.id,
      name: carrier.label,
      text,
      isValid,
      theoreticalLabel: `Théorique ${formatFinanceAmount(theoreticalCents)}`,
      placeholder: String(theoreticalCents / 100),
      openingMissing,
      // "—" until the field is filled; "Juste" iff the variance is zero.
      varianceLabel: variance === null ? '—' : variance === 0 ? 'Juste' : formatSignedFinanceAmount(variance),
      isJust: variance === 0,
      countedCents: isValid ? parseCents(text) : null,
    }
  })

  // Filled fields only, so the total stays readable mid-entry (never NaN).
  const totalCountedCents = rows.reduce((total, row) => total + (row.countedCents ?? 0), 0)
  const debriefError = validateDebrief(debrief)
  const allCounted = rows.length > 0 && rows.every((row) => row.isValid)

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('No authenticated session.')
      return recordTreasuryCheckpointUseCase.execute({
        actorId: user.id,
        checkedOn: today,
        today,
        debrief,
        counts: rows.map((row) => ({ carrierId: row.id, countedCents: row.countedCents ?? 0 })),
      })
    },
    onSuccess: () => {
      // AC-FI-20 — history and "Compté …" lines derive from the snapshot.
      void queryClient.invalidateQueries({ queryKey: queryKeys.financesRoot() })
      onRecorded()
    },
  })

  const canSubmit = allCounted && debriefError === null && !mutation.isPending

  return {
    rows,
    setCount: (carrierId: string, value: string) => setCounts((current) => ({ ...current, [carrierId]: value })),
    totalCountedLabel: formatFinanceAmount(totalCountedCents),
    debrief,
    setDebrief,
    maxDebriefLength: MAX_DEBRIEF_LENGTH,
    isDebriefTooLong: debriefError !== null,
    isDirty: Object.values(counts).some((value) => value !== '') || debrief !== '',
    canSubmit,
    isSubmitting: mutation.isPending,
    errorMessage: mutation.error ? mapDomainErrorToUiError(mutation.error).message : null,
    submit: () => {
      if (!canSubmit) return
      mutation.mutate()
    },
  }
}
