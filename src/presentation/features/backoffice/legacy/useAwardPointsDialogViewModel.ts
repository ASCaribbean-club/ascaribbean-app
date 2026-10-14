import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { LegacyRule } from '@domain/entities/legacy'
import { manualRulesValidOn } from '@domain/policies/legacy-rules'
import { useLegacyDependencies } from '@presentation/di/hooks/use-legacy-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { clubToday } from '@presentation/shared/formatters/club-date'
import { LEGACY_ACTION_LABELS } from '@presentation/shared/formatters/legacy-labels'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

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
  const { awardLegacyPointsUseCase } = useLegacyDependencies()

  const [userId, setUserId] = useState('')
  const [earnedOn, setEarnedOn] = useState(() => clubToday(new Date()))
  const [ruleId, setRuleId] = useState('')
  const [variablePoints, setVariablePoints] = useState('')
  const [reason, setReason] = useState('')

  // A date change can invalidate the chosen rule: it is then simply not offered
  // (and not selected) any more.
  const availableRules = manualRulesValidOn(rules, earnedOn)
  const rule = availableRules.find((r) => r.id === ruleId) ?? null
  const points =
    rule === null ? null : rule.pointsKind === 'fixed' ? rule.points : variablePoints.trim() === '' ? null : Number(variablePoints)

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('No authenticated session.')
      if (rule === null || points === null) throw new Error('Incomplete form.')
      return awardLegacyPointsUseCase.execute({ actorId: user.id, userId, ruleId: rule.id, points, reason, earnedOn })
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
    (rule.pointsKind === 'fixed' || (points >= 0 && points <= (rule.maxPoints ?? 0)))

  return {
    userId,
    setUserId,
    earnedOn,
    setEarnedOn,
    ruleId: rule?.id ?? '',
    setRuleId,
    variablePoints,
    setVariablePoints,
    reason,
    setReason,

    ruleOptions: availableRules.map((r) => ({
      id: r.id,
      label: `${LEGACY_ACTION_LABELS[r.action]} (${r.pointsKind === 'fixed' ? `${r.points} pts` : `0 à ${r.maxPoints} pts`})`,
    })),
    isVariable: rule?.pointsKind === 'variable',
    maxPoints: rule?.maxPoints ?? null,
    fixedPoints: rule?.pointsKind === 'fixed' ? rule.points : null,

    canSubmit: userId !== '' && earnedOn !== '' && isPointsValid && reason.trim() !== '' && !mutation.isPending,
    isSubmitting: mutation.isPending,
    errorMessage: mutation.error ? mapDomainErrorToUiError(mutation.error).message : null,
    submit: () => mutation.mutate(),
  }
}
