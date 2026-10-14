import { describe, expect, it } from 'vitest'
import type { LegacyEntry, LegacyRule } from '@domain/entities/legacy'
import {
  computeLedgerKpis,
  filterLedger,
  ledgerActionOf,
  NO_LEDGER_FILTERS,
  toLedgerRows,
} from './legacy-ledger'

const RULES: LegacyRule[] = [
  { id: 'r-train', action: 'training_attendance', teamType: 'football', channel: 'automatic', pointsKind: 'fixed', points: 5, maxPoints: null, reasonRequired: false, validFrom: '2026-08-01', validTo: null },
  { id: 'r-ref', action: 'referral', teamType: null, channel: 'manual', pointsKind: 'fixed', points: 15, maxPoints: null, reasonRequired: true, validFrom: '2026-08-01', validTo: null },
]

function entry(overrides: Partial<LegacyEntry> & { id: string }): LegacyEntry {
  return {
    userId: 'u1',
    points: 5,
    ruleId: 'r-train',
    source: { kind: 'convocation', convocationId: 'c1' },
    corrects: null,
    earnedOn: '2026-10-01',
    createdAt: '2026-10-04T10:00:00Z',
    createdBy: null,
    ...overrides,
  }
}

const NAMES = { u1: 'Joueur A', u2: 'Joueur B' }

const ENTRIES: LegacyEntry[] = [
  entry({ id: 'e1' }),
  entry({ id: 'e2', userId: 'u2', earnedOn: '2026-10-03' }),
  entry({ id: 'e3', ruleId: 'r-ref', points: 15, source: { kind: 'manual', reason: 'Parrainage' }, earnedOn: '2026-10-02' }),
  entry({ id: 'e4', ruleId: null, points: -5, source: { kind: 'manual', reason: 'Erreur' }, corrects: 'e1', earnedOn: '2026-10-05' }),
]

describe('ledgerActionOf', () => {
  it('reads the action from the rule, a correction as its own action', () => {
    expect(ledgerActionOf(ENTRIES[0], RULES)).toBe('training_attendance')
    expect(ledgerActionOf(ENTRIES[3], RULES)).toBe('correction')
  })
  it('maps a season-end entry and tolerates an unknown rule', () => {
    expect(ledgerActionOf(entry({ id: 's', ruleId: 'r-x', source: { kind: 'season_end', seasonId: 's1' } }), RULES)).toBe('season_end_bonus')
    expect(ledgerActionOf(entry({ id: 'u', ruleId: 'unknown' }), RULES)).toBeNull()
  })
})

describe('toLedgerRows', () => {
  it('sorts by date of the fact, most recent first, and names the player', () => {
    const rows = toLedgerRows(ENTRIES, RULES, NAMES)
    expect(rows.map((r) => r.entry.id)).toEqual(['e4', 'e2', 'e3', 'e1'])
    expect(rows[1].playerName).toBe('Joueur B')
  })
  it('falls back for an unknown player', () => {
    expect(toLedgerRows([ENTRIES[0]], RULES, {})[0].playerName).toBe('Joueur inconnu')
  })
  it('classifies corrections and awards as manual, the rest as automatic', () => {
    const byId = Object.fromEntries(toLedgerRows(ENTRIES, RULES, NAMES).map((r) => [r.entry.id, r.attribution]))
    expect(byId).toEqual({ e1: 'automatic', e2: 'automatic', e3: 'manual', e4: 'manual' })
  })
})

describe('filterLedger', () => {
  const rows = toLedgerRows(ENTRIES, RULES, NAMES)

  it('returns everything without filters', () => {
    expect(filterLedger(rows, NO_LEDGER_FILTERS)).toHaveLength(4)
  })
  it('filters by player, action and attribution, and combines them', () => {
    expect(filterLedger(rows, { ...NO_LEDGER_FILTERS, userId: 'u2' }).map((r) => r.entry.id)).toEqual(['e2'])
    expect(filterLedger(rows, { ...NO_LEDGER_FILTERS, action: 'referral' }).map((r) => r.entry.id)).toEqual(['e3'])
    expect(filterLedger(rows, { ...NO_LEDGER_FILTERS, attribution: 'manual' })).toHaveLength(2)
    expect(filterLedger(rows, { userId: 'u1', action: 'training_attendance', attribution: 'automatic' })).toHaveLength(1)
  })
})

describe('computeLedgerKpis', () => {
  it('sums net points, counts entries and players, splits automatic and manual', () => {
    const kpis = computeLedgerKpis(toLedgerRows(ENTRIES, RULES, NAMES))
    expect(kpis.netPoints).toBe(20) // 5 + 5 + 15 - 5
    expect(kpis.entryCount).toBe(4)
    expect(kpis.playerCount).toBe(2)
    expect(kpis.automaticPoints).toBe(10)
    expect(kpis.manualPoints).toBe(10)
    expect(kpis.manualSharePercent).toBe(50)
  })
  it('finds the action that earned the most net points', () => {
    expect(computeLedgerKpis(toLedgerRows(ENTRIES, RULES, NAMES)).topAction).toEqual({ action: 'referral', points: 15 })
  })
  it('handles an empty list and a zero net', () => {
    const empty = computeLedgerKpis([])
    expect(empty).toMatchObject({ netPoints: 0, entryCount: 0, playerCount: 0, manualSharePercent: null, topAction: null })
  })
})
