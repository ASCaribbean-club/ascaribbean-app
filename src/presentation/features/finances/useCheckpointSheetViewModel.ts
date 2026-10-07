import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FinancesSnapshot, TreasuryCheckpoint } from '@domain/entities/finance'
import { MAX_DEBRIEF_LENGTH, hasCheckpointChanged, validateDebrief, validateMoneyInput } from '@domain/rules/finance-form-rules'
import { isCarrierArchived, varianceCents, summarizeTreasury } from '@domain/rules/finance-rules'
import { useFinancesDependencies } from '@presentation/di/hooks/use-finances-dependencies'
import { formatFinanceAmount, formatSignedFinanceAmount } from '@presentation/shared/formatters/finance-amounts'
import { formatFullDate } from '@presentation/shared/formatters/club-date'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'
import { amountInputToCents, centsToAmountInput } from './amount-input'
import { financeCorrectionErrorMessage } from './finance-error-messages'

interface Params {
  snapshot: FinancesSnapshot
  today: string
  // Present = CORRECTION mode (specs/mob-treasurer-finances-edit.md §6): the
  // point is prefilled with its recorded counts, the theoretical amounts shown
  // are the FROZEN ones, the debrief is read on opening.
  checkpoint?: TreasuryCheckpoint
  // can('treasury_checkpoint:delete') && isTreasurerView, from useFinancesViewModel.
  canDeleteCheckpoint: boolean
  onRecorded: () => void
}

// specs/mob-treasurer-finances.md §7 (AC-FI-18..20) — "Point de trésorerie".
// Fields start EMPTY with the theoretical amount as placeholder (O-FI-UI-01):
// saving is possible only once every carrier has been counted (a "0" is a
// valid count). The variance is the domain rule; the theoretical amounts
// stored with the point are computed by the SERVER (never sent from here).
//
// Correction mode (PO-FIE-02 default): only the counted amounts and the debrief
// are editable; the variance is recomputed against the frozen theoretical
// amount (counted - frozen, pure rule varianceCents()).
export function useCheckpointSheetViewModel({ snapshot, today, checkpoint, canDeleteCheckpoint, onRecorded }: Params) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const {
    recordTreasuryCheckpointUseCase,
    updateTreasuryCheckpointUseCase,
    deleteTreasuryCheckpointUseCase,
    getTreasuryCheckpointDetailUseCase,
  } = useFinancesDependencies()
  const isEditing = checkpoint !== undefined

  const [counts, setCounts] = useState<Record<string, string>>(
    checkpoint ? Object.fromEntries(checkpoint.lines.map((line) => [line.carrierId, centsToAmountInput(line.countedCents)])) : {},
  )
  // null = untouched: the debrief shown is the one read from the server.
  const [debriefDraft, setDebriefDraft] = useState<string | null>(null)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  // Dedicated read of the debrief (PO-FIE-04), only when correcting. Always
  // refetched on opening (gcTime 0), and part of financesRoot so any finance
  // write drops it.
  const detailQuery = useQuery({
    queryKey: queryKeys.financeCheckpointDetail(checkpoint?.id ?? ''),
    queryFn: () => {
      if (!user || !checkpoint) throw new Error('No authenticated session or checkpoint.')
      return getTreasuryCheckpointDetailUseCase.execute({ actorId: user.id, checkpointId: checkpoint.id })
    },
    enabled: isEditing && user !== null,
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
  })
  const loadedDebrief = detailQuery.data?.debrief ?? ''
  const isDebriefLoaded = !isEditing || detailQuery.isSuccess
  const debrief = debriefDraft ?? loadedDebrief

  const summaryByCarrier = new Map(summarizeTreasury(snapshot).carriers.map((entry) => [entry.carrier.id, entry]))
  const sourceRows = checkpoint
    ? checkpoint.lines.map((line) => ({
        id: line.carrierId,
        // An archived carrier of a past point is still named (history stays visible).
        name: snapshot.carriers.find((carrier) => carrier.id === line.carrierId)?.label ?? '',
        theoreticalCents: line.theoreticalCents, // FROZEN (AC-FIE-11)
        openingMissing: false,
      }))
    : // A NEW point counts the ACTIVE carriers only (specs/finances-member-
      // advances.md AC-FA-18/21); a past point keeps its own lines.
      [...summaryByCarrier.values()]
        .filter(({ carrier }) => !isCarrierArchived(carrier))
        .map(({ carrier, theoreticalCents, openingMissing }) => ({
        id: carrier.id,
        name: carrier.label,
        theoreticalCents,
        openingMissing,
      }))

  const rows = sourceRows.map(({ id, name, theoreticalCents, openingMissing }) => {
    const text = counts[id] ?? ''
    const isValid = validateMoneyInput(text, true) === null
    const variance = isValid ? varianceCents(amountInputToCents(text), theoreticalCents) : null
    return {
      id,
      name,
      text,
      isValid,
      theoreticalLabel: `${isEditing ? 'Théorique figé' : 'Théorique'} ${formatFinanceAmount(theoreticalCents)}`,
      placeholder: String(theoreticalCents / 100),
      openingMissing,
      // "—" until the field is filled; "Juste" iff the variance is zero.
      varianceLabel: variance === null ? '—' : variance === 0 ? 'Juste' : formatSignedFinanceAmount(variance),
      isJust: variance === 0,
      countedCents: isValid ? amountInputToCents(text) : null,
    }
  })

  // Filled fields only, so the total stays readable mid-entry (never NaN).
  const totalCountedCents = rows.reduce((total, row) => total + (row.countedCents ?? 0), 0)
  const debriefError = validateDebrief(debrief)
  const allCounted = rows.length > 0 && rows.every((row) => row.isValid)

  const isUnchanged =
    checkpoint !== undefined &&
    isDebriefLoaded &&
    allCounted &&
    !hasCheckpointChanged(
      { counts: checkpoint.lines.map((line) => ({ carrierId: line.carrierId, countedCents: line.countedCents })), debrief: loadedDebrief },
      { counts: rows.map((row) => ({ carrierId: row.id, countedCents: row.countedCents ?? 0 })), debrief },
    )

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('No authenticated session.')
      const countInputs = rows.map((row) => ({ carrierId: row.id, countedCents: row.countedCents ?? 0 }))
      if (checkpoint) {
        return updateTreasuryCheckpointUseCase.execute({ actorId: user.id, checkpointId: checkpoint.id, debrief, counts: countInputs })
      }
      return recordTreasuryCheckpointUseCase.execute({ actorId: user.id, checkedOn: today, today, debrief, counts: countInputs })
    },
    onSuccess: () => {
      // AC-FI-20 — history and "Compté …" lines derive from the snapshot.
      void queryClient.invalidateQueries({ queryKey: queryKeys.financesRoot() })
      onRecorded()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!user || !checkpoint) throw new Error('No authenticated session or checkpoint.')
      return deleteTreasuryCheckpointUseCase.execute({ actorId: user.id, checkpointId: checkpoint.id })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.financesRoot() })
      onRecorded()
    },
    onError: () => setIsConfirmingDelete(false),
  })

  // Saving needs the debrief to be READ first, or an unloaded debrief would be
  // overwritten by an empty one (§6).
  const canSubmit =
    allCounted && debriefError === null && isDebriefLoaded && !isUnchanged && !mutation.isPending && !deleteMutation.isPending

  const mutationError = mutation.error ?? deleteMutation.error

  return {
    isEditing,
    title: checkpoint ? `Corriger le point du ${formatFullDate(checkpoint.checkedOn)}` : 'Point de trésorerie',
    description: isEditing
      ? 'Le théorique de ce point est figé ; seuls les montants constatés et le débrief se corrigent.'
      : "Indique le montant réellement constaté pour chaque porteur. L'écart est calculé par rapport au solde théorique.",
    submitLabel: isEditing ? 'Enregistrer les corrections' : 'Enregistrer le point',
    rows,
    setCount: (carrierId: string, value: string) => setCounts((current) => ({ ...current, [carrierId]: value })),
    totalCountedLabel: formatFinanceAmount(totalCountedCents),
    debrief,
    setDebrief: setDebriefDraft,
    maxDebriefLength: MAX_DEBRIEF_LENGTH,
    isDebriefTooLong: debriefError !== null,
    // Debrief states of the correction sheet (§6): skeleton while reading,
    // message + "Réessayer" on failure.
    isDebriefLoading: isEditing && detailQuery.isPending,
    hasDebriefError: isEditing && detailQuery.isError,
    retryDebrief: () => void detailQuery.refetch(),
    isDirty: isEditing ? !isUnchanged : Object.values(counts).some((value) => value !== '') || debrief !== '',
    canSubmit,
    isSubmitting: mutation.isPending,
    errorMessage: mutationError ? financeCorrectionErrorMessage(mutationError) : null,
    submit: () => {
      if (!canSubmit) return
      mutation.mutate()
    },

    deletion:
      checkpoint && canDeleteCheckpoint
        ? {
            label: 'Supprimer le point',
            confirmMessage: `Supprimer le point du ${formatFullDate(checkpoint.checkedOn)} ? Les montants constatés de tous les porteurs seront supprimés. Cette action est définitive.`,
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
