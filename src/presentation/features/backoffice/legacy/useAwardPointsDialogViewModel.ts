import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LegacyRule } from '@domain/entities/legacy'
import { legacyMinimumPoints, manualRulesValidOn } from '@domain/policies/legacy-rules'
import { useLegacyDependencies } from '@presentation/di/hooks/use-legacy-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { clubToday } from '@presentation/shared/formatters/club-date'
import { LEGACY_ACTION_LABELS } from '@presentation/shared/formatters/legacy-labels'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

// "01/07/2024" from a yyyy-mm-dd date, built from its parts (no UTC shift).
function formatShortNumericDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

interface UseAwardPointsDialogViewModelParams {
  rules: LegacyRule[]
  onSuccess: () => void
}

// docs/specs/asc-legacy.md §6.2/PO-LG-08 — a manual award: pick a player, a date
// and a manual rule valid at that date. A fixed rule carries its own points
// (read-only); only a variable rule (engagement exceptionnel) takes a value,
// bounded by the rule. A reason is mandatory (PO-LG-19). Remounted per opening
// (`key` in the dialog), so the initial state below is read exactly once.
export function useAwardPointsDialogViewModel({ rules, onSuccess }: UseAwardPointsDialogViewModelParams) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { awardLegacyPointsUseCase, seasonRepository } = useLegacyDependencies()

  const [userId, setUserId] = useState('')
  const [earnedOn, setEarnedOn] = useState(() => clubToday(new Date()))
  const [ruleId, setRuleId] = useState('')
  const [variablePoints, setVariablePoints] = useState('')
  const [reason, setReason] = useState('')
  // Set only when the admin picks a season by hand; a date change clears it so the
  // season follows the date again.
  const [seasonOverride, setSeasonOverride] = useState('')

  // The season select exists for the catch-up only (PO-LPC-03); every season is
  // listed, configured or not (UI-LPC-01), most recent first.
  const seasonsQuery = useQuery({
    queryKey: queryKeys.seasonsAdminList(),
    queryFn: () => seasonRepository.findAll(),
  })

  // A date change can invalidate the chosen rule: it is then simply not offered
  // (and not selected) any more.
  const availableRules = manualRulesValidOn(rules, earnedOn)
  const rule = availableRules.find((r) => r.id === ruleId) ?? null
  const points =
    rule === null ? null : rule.pointsKind === 'fixed' ? rule.points : variablePoints.trim() === '' ? null : Number(variablePoints)

  const isCatchup = rule?.action === 'points_catchup'
  const seasonOptions = [...(seasonsQuery.data ?? [])]
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .map((s) => ({ id: s.id, label: s.label, rangeLabel: `Saison ${s.label} : du ${formatShortNumericDate(s.startDate)} au ${formatShortNumericDate(s.endDate)}` }))
  // The season is pre-selected from the date (seasons never overlap, PO-LG-01),
  // same inclusive bounds as AwardLegacyPointsUseCase. A manual pick wins until
  // the date changes.
  const seasonFromDate = (seasonsQuery.data ?? []).find((s) => s.startDate <= earnedOn && earnedOn <= s.endDate)
  const seasonId = seasonOverride !== '' ? seasonOverride : (seasonFromDate?.id ?? '')
  const selectedSeason = isCatchup ? (seasonOptions.find((s) => s.id === seasonId) ?? null) : null

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('No authenticated session.')
      if (rule === null || points === null) throw new Error('Incomplete form.')
      return awardLegacyPointsUseCase.execute({ actorId: user.id, userId, ruleId: rule.id, points, reason, earnedOn, seasonId: isCatchup ? seasonId : undefined })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.legacyRoot() })
      onSuccess()
    },
  })

  const isPointsValid =
    rule !== null &&
    points !== null &&
    Number.isInteger(points) &&
    (rule.pointsKind === 'fixed' || (points >= legacyMinimumPoints(rule) && points <= (rule.maxPoints ?? 0)))

  return {
    userId,
    setUserId,
    earnedOn,
    setEarnedOn: (value: string) => {
      setEarnedOn(value)
      setSeasonOverride('')
    },
    ruleId: rule?.id ?? '',
    setRuleId,
    variablePoints,
    setVariablePoints,
    reason,
    setReason,
    seasonId,
    setSeasonId: setSeasonOverride,
    isCatchup,
    seasonOptions,
    selectedSeasonRangeLabel: selectedSeason?.rangeLabel ?? null,

    ruleOptions: availableRules.map((r) => ({
      id: r.id,
      label: `${LEGACY_ACTION_LABELS[r.action]} (${r.pointsKind === 'fixed' ? `${r.points} pts` : `${legacyMinimumPoints(r)} à ${r.maxPoints} pts`})`,
    })),
    isVariable: rule?.pointsKind === 'variable',
    minPoints: rule ? legacyMinimumPoints(rule) : 0,
    maxPoints: rule?.maxPoints ?? null,
    fixedPoints: rule?.pointsKind === 'fixed' ? rule.points : null,

    canSubmit: userId !== '' && earnedOn !== '' && isPointsValid && reason.trim() !== '' && (!isCatchup || seasonId !== '') && !mutation.isPending,
    isSubmitting: mutation.isPending,
    errorMessage: mutation.error ? mapDomainErrorToUiError(mutation.error).message : null,
    submit: () => mutation.mutate(),
  }
}
