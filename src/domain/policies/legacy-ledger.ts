import type { LegacyAction, LegacyEntry, LegacyRule } from '@domain/entities/legacy'

/**
 * Backoffice "points attribués" list (docs/specs/asc-legacy.md §6.4): which
 * action produced which points, filterable, with key indicators. Pure and
 * display-side — no SQL counterpart, the ledger itself is the source of truth
 * and nothing here is stored (PO-LG-01).
 */

// A correction has no rule (PO-LG-01): it is its own "action" in the list.
export type LedgerAction = LegacyAction | 'correction'

// Automatic = derived from a closed convocation or the season-end bonus;
// manual = awarded or corrected by an officer or the admin.
export type LedgerAttribution = 'automatic' | 'manual'

export interface LedgerRow {
  entry: LegacyEntry
  playerName: string
  action: LedgerAction | null // null: the rule version is unknown
  attribution: LedgerAttribution
}

export interface LedgerFilters {
  userId: string | null
  action: LedgerAction | null
  attribution: LedgerAttribution | null
}

export const NO_LEDGER_FILTERS: LedgerFilters = { userId: null, action: null, attribution: null }

export function ledgerActionOf(entry: LegacyEntry, rules: LegacyRule[]): LedgerAction | null {
  if (entry.corrects !== null) return 'correction'
  if (entry.source.kind === 'season_end') return 'season_end_bonus'
  return rules.find((r) => r.id === entry.ruleId)?.action ?? null
}

export function ledgerAttributionOf(entry: LegacyEntry): LedgerAttribution {
  return entry.source.kind === 'manual' ? 'manual' : 'automatic'
}

// Most recent fact first, then most recently written.
export function toLedgerRows(
  entries: LegacyEntry[],
  rules: LegacyRule[],
  playerNames: Record<string, string>,
): LedgerRow[] {
  return entries
    .map((entry) => ({
      entry,
      playerName: playerNames[entry.userId] ?? 'Joueur inconnu',
      action: ledgerActionOf(entry, rules),
      attribution: ledgerAttributionOf(entry),
    }))
    .sort(
      (a, b) =>
        b.entry.earnedOn.localeCompare(a.entry.earnedOn) || b.entry.createdAt.localeCompare(a.entry.createdAt),
    )
}

export function filterLedger(rows: LedgerRow[], filters: LedgerFilters): LedgerRow[] {
  return rows.filter(
    (row) =>
      (filters.userId === null || row.entry.userId === filters.userId) &&
      (filters.action === null || row.action === filters.action) &&
      (filters.attribution === null || row.attribution === filters.attribution),
  )
}

export interface LedgerKpis {
  netPoints: number
  entryCount: number
  playerCount: number
  automaticPoints: number
  manualPoints: number
  // Share of the net points that came from manual entries; null when the net is 0.
  manualSharePercent: number | null
  // The action that earned the most net points; null on an empty list.
  topAction: { action: LedgerAction; points: number } | null
}

// Computed on whatever rows it is given, so the indicators follow the filters.
export function computeLedgerKpis(rows: LedgerRow[]): LedgerKpis {
  let automaticPoints = 0
  let manualPoints = 0
  const pointsByAction = new Map<LedgerAction, number>()

  for (const row of rows) {
    if (row.attribution === 'manual') manualPoints += row.entry.points
    else automaticPoints += row.entry.points
    if (row.action !== null) pointsByAction.set(row.action, (pointsByAction.get(row.action) ?? 0) + row.entry.points)
  }

  const netPoints = automaticPoints + manualPoints
  let topAction: LedgerKpis['topAction'] = null
  for (const [action, points] of pointsByAction) {
    if (topAction === null || points > topAction.points) topAction = { action, points }
  }

  return {
    netPoints,
    entryCount: rows.length,
    playerCount: new Set(rows.map((r) => r.entry.userId)).size,
    automaticPoints,
    manualPoints,
    manualSharePercent: netPoints === 0 ? null : Math.round((manualPoints / netPoints) * 100),
    topAction,
  }
}
