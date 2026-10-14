import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { LegacyEntry, LegacyRule } from '@domain/entities/legacy'
import {
  computeLedgerKpis,
  filterLedger,
  NO_LEDGER_FILTERS,
  toLedgerRows,
  type LedgerRow,
  type LedgerAction,
  type LedgerAttribution,
  type LedgerFilters,
} from '@domain/policies/legacy-ledger'
import { useLegacyDependencies } from '@presentation/di/hooks/use-legacy-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { LEGACY_ACTION_LABELS, LEGACY_CORRECTION_LABEL, formatLegacyPoints } from '@presentation/shared/formatters/legacy-labels'
import { formatLongDate } from '@presentation/shared/formatters/long-date'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'

// One named constant for the page size, never a literal repeated elsewhere.
//
// ⚠️ WARNING — this is a DISPLAY page size only, not real pagination: the whole
// ledger is fetched at once (LegacyRepositoryImpl.findAllEntries), then filtered,
// aggregated and sliced here. Beyond ~1000 entries (the PostgREST response cap)
// the list and the KPIs would be silently wrong. Move filtering, paging and the
// KPIs server-side before then.
export const LEDGER_PAGE_SIZE = 50

export const ATTRIBUTION_LABELS: Record<LedgerAttribution, string> = {
  automatic: 'Automatique',
  manual: 'Manuelle',
}

export interface PlayerOption {
  id: string
  name: string
}

// What the expanded row of an entry says about where its points come from.
export type LedgerSourceView =
  | { kind: 'convocation'; convocationId: string | null } // null: the convocation was deleted (PO-LG-23)
  | { kind: 'manual'; reason: string; authorName: string; createdOn: string; correctsLabel: string | null }
  | { kind: 'season_end' }

export interface LedgerRowView {
  id: string
  date: string
  playerName: string
  actionLabel: string
  attributionLabel: string
  isManual: boolean
  points: string
  isNegative: boolean
  detail: string
  source: LedgerSourceView
}

function actionLabel(action: LedgerAction | null): string {
  if (action === null) return 'Points Legacy'
  return action === 'correction' ? LEGACY_CORRECTION_LABEL : LEGACY_ACTION_LABELS[action]
}

function toSourceView(entry: LegacyEntry, playerNames: Record<string, string>, entriesById: Map<string, LedgerRow>): LedgerSourceView {
  const { source } = entry
  if (source.kind === 'convocation') return { kind: 'convocation', convocationId: source.convocationId }
  if (source.kind === 'season_end') return { kind: 'season_end' }

  const corrected = entry.corrects ? entriesById.get(entry.corrects) : undefined
  return {
    kind: 'manual',
    reason: source.reason,
    authorName: (entry.createdBy && playerNames[entry.createdBy]) || 'Compte supprimé',
    createdOn: formatLongDate(entry.createdAt.slice(0, 10)),
    correctsLabel: corrected
      ? `${actionLabel(corrected.action)} du ${formatLongDate(corrected.entry.earnedOn)} (${formatLegacyPoints(corrected.entry.points, { signed: true })})`
      : entry.corrects
        ? 'Une entrée supprimée'
        : null,
  }
}

// docs/specs/asc-legacy.md §6.4 — the ledger of points, filterable by player,
// action and attribution, with indicators that follow the filters. Read-only
// list plus the entry point of the manual award dialog.
export function useLegacyPointsViewModel() {
  const { legacyRepository, userRepository } = useLegacyDependencies()
  // 'legacy:award' — UX only (RLS is the boundary): the FAB is absent, never greyed.
  const canAward = usePermission('legacy:award')

  const entriesQuery = useQuery({
    queryKey: queryKeys.legacyLedger(),
    queryFn: () => legacyRepository.findAllEntries(),
  })
  const rulesQuery = useQuery({
    queryKey: queryKeys.legacyRules(),
    queryFn: () => legacyRepository.findRules(),
  })
  // The admin directory carries the roles, so the list of players (the only
  // members who earn points) comes from it.
  const playersQuery = useQuery({
    queryKey: queryKeys.legacyPlayers(),
    queryFn: () => userRepository.findAdminDirectory(null),
  })

  const [filters, setFilters] = useState<LedgerFilters>(NO_LEDGER_FILTERS)
  const [visibleCount, setVisibleCount] = useState(LEDGER_PAGE_SIZE)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isAwardDialogOpen, setIsAwardDialogOpen] = useState(false)

  const rules: LegacyRule[] = rulesQuery.data ?? []
  const players: PlayerOption[] = (playersQuery.data ?? [])
    .filter((user) => user.roles.some((assignment) => assignment.role === 'player'))
    .map((user) => ({ id: user.id, name: user.fullName }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  const playerNames = Object.fromEntries((playersQuery.data ?? []).map((user) => [user.id, user.fullName]))

  const allRows = toLedgerRows(entriesQuery.data ?? [], rules, playerNames)
  const filteredRows = filterLedger(allRows, filters)
  const kpis = computeLedgerKpis(filteredRows)

  const entriesById = new Map(allRows.map((row) => [row.entry.id, row]))

  const rows: LedgerRowView[] = filteredRows.slice(0, visibleCount).map(({ entry, playerName, action, attribution }) => ({
    id: entry.id,
    date: formatLongDate(entry.earnedOn),
    playerName,
    actionLabel: actionLabel(action),
    attributionLabel: ATTRIBUTION_LABELS[attribution],
    isManual: attribution === 'manual',
    points: formatLegacyPoints(entry.points, { signed: true }),
    isNegative: entry.points < 0,
    detail: entry.source.kind === 'manual' ? entry.source.reason : entry.source.kind === 'season_end' ? 'Fin de saison' : 'Convocation',
    source: toSourceView(entry, playerNames, entriesById),
  }))

  function setFilter<K extends keyof LedgerFilters>(key: K, value: LedgerFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }))
    setVisibleCount(LEDGER_PAGE_SIZE)
  }

  const error = entriesQuery.error ?? rulesQuery.error ?? playersQuery.error

  return {
    isLoading: entriesQuery.isLoading || rulesQuery.isLoading || playersQuery.isLoading,
    error: error ? mapDomainErrorToUiError(error) : null,

    canAward,
    isAwardDialogOpen,
    openAwardDialog: () => setIsAwardDialogOpen(true),
    closeAwardDialog: () => setIsAwardDialogOpen(false),
    players,
    rules,

    filters,
    setUserFilter: (id: string | null) => setFilter('userId', id),
    setActionFilter: (action: LedgerAction | null) => setFilter('action', action),
    setAttributionFilter: (attribution: LedgerAttribution | null) => setFilter('attribution', attribution),
    hasActiveFilters: filters.userId !== null || filters.action !== null || filters.attribution !== null,
    resetFilters: () => {
      setFilters(NO_LEDGER_FILTERS)
      setVisibleCount(LEDGER_PAGE_SIZE)
    },
    // Only the actions that exist in the ledger are offered as filter choices.
    actionOptions: [...new Set(allRows.map((row) => row.action).filter((a): a is LedgerAction => a !== null))].map((action) => ({
      value: action,
      label: actionLabel(action),
    })),
    attributionOptions: (Object.keys(ATTRIBUTION_LABELS) as LedgerAttribution[]).map((value) => ({
      value,
      label: ATTRIBUTION_LABELS[value],
    })),

    kpis: {
      netPoints: formatLegacyPoints(kpis.netPoints),
      entryCount: kpis.entryCount.toLocaleString('fr-FR'),
      playerCount: kpis.playerCount.toLocaleString('fr-FR'),
      manualShare: kpis.manualSharePercent === null ? '—' : `${kpis.manualSharePercent} %`,
      topAction: kpis.topAction ? actionLabel(kpis.topAction.action) : '—',
      topActionPoints: kpis.topAction ? formatLegacyPoints(kpis.topAction.points, { signed: true }) : null,
    },

    rows,
    expandedId,
    toggleExpanded: (id: string) => setExpandedId((current) => (current === id ? null : id)),
    totalCount: filteredRows.length,
    hasMore: filteredRows.length > visibleCount,
    showMore: () => setVisibleCount((count) => count + LEDGER_PAGE_SIZE),
  }
}
