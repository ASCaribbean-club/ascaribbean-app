import { useQuery } from '@tanstack/react-query'
import { LEGACY_ACTIONS, type LegacyRule } from '@domain/entities/legacy'
import { ruleValidityOn, type RuleValidity } from '@domain/policies/legacy-rules'
import { useLegacyDependencies } from '@presentation/di/hooks/use-legacy-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { clubToday } from '@presentation/shared/formatters/club-date'
import { LEGACY_ACTION_LABELS, SECTION_TYPE_LABELS } from '@presentation/shared/formatters/legacy-labels'
import { formatLongDate } from '@presentation/shared/formatters/long-date'
import { queryKeys } from '@presentation/shared/query-keys'

export interface LegacyRuleRow {
  id: string
  action: string
  channel: string
  teamType: string
  points: string
  reasonRequired: boolean
  validity: RuleValidity
  period: string
}

function formatRulePoints(rule: LegacyRule): string {
  // Variable rule (exceptional commitment): bounded, 0 to the maximum.
  if (rule.pointsKind === 'variable') return `0 à ${rule.maxPoints} pts`
  return `${rule.points} pts`
}

function toRow(rule: LegacyRule, today: string): LegacyRuleRow {
  return {
    id: rule.id,
    action: LEGACY_ACTION_LABELS[rule.action],
    channel: rule.channel === 'automatic' ? 'Automatique' : 'Manuelle',
    // Manual rules and the season-end bonus have no team type (PO-LG-23/26).
    teamType: rule.teamType ? SECTION_TYPE_LABELS[rule.teamType] : 'Toutes',
    points: formatRulePoints(rule),
    reasonRequired: rule.reasonRequired,
    validity: ruleValidityOn(rule, today),
    period: rule.validTo
      ? `Du ${formatLongDate(rule.validFrom)} au ${formatLongDate(rule.validTo)}`
      : `Depuis le ${formatLongDate(rule.validFrom)}`,
  }
}

// docs/specs/asc-legacy.md §1/§6.4 — read-only list of the référentiel (every
// version of every rule). Editing the référentiel is a later pass.
// Order: the barème order of §1, then team type, then most recent version first.
export function useLegacyRulesViewModel() {
  const { legacyRepository } = useLegacyDependencies()
  const rulesQuery = useQuery({
    queryKey: queryKeys.legacyRules(),
    queryFn: () => legacyRepository.findRules(),
  })

  const today = clubToday(new Date())
  const rows = [...(rulesQuery.data ?? [])]
    .sort(
      (a, b) =>
        LEGACY_ACTIONS.indexOf(a.action) - LEGACY_ACTIONS.indexOf(b.action) ||
        (a.teamType ?? '').localeCompare(b.teamType ?? '') ||
        b.validFrom.localeCompare(a.validFrom),
    )
    .map((rule) => toRow(rule, today))

  return {
    isLoading: rulesQuery.isLoading,
    error: rulesQuery.error ? mapDomainErrorToUiError(rulesQuery.error) : null,
    rows,
  }
}
