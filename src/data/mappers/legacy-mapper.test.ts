import { describe, expect, it } from 'vitest'
import type { LegacyPointsEntryRow, LegacyRuleRow } from '../dto/legacy-dto'
import { toLegacyEntry, toLegacyManualEntryInsertRow, toLegacyRule } from './legacy-mapper'

const entryRow: LegacyPointsEntryRow = {
  id: 'e1',
  user_id: 'u1',
  points: 5,
  rule_id: 'r1',
  source: 'convocation',
  convocation_id: 'c1',
  season_id: null,
  reason: null,
  corrects: null,
  earned_on: '2026-10-01',
  created_at: '2026-10-04T10:00:00Z',
  created_by: null,
}

describe('toLegacyEntry', () => {
  it('maps a convocation source', () => {
    expect(toLegacyEntry(entryRow).source).toEqual({ kind: 'convocation', convocationId: 'c1' })
  })
  it('keeps the entry when its convocation was deleted (convocation_id null)', () => {
    expect(toLegacyEntry({ ...entryRow, convocation_id: null }).source).toEqual({
      kind: 'convocation',
      convocationId: null,
    })
  })
  it('maps a manual source with its reason and the corrected entry', () => {
    const entry = toLegacyEntry({
      ...entryRow,
      source: 'manual',
      convocation_id: null,
      rule_id: null,
      reason: 'Attendance error',
      corrects: 'e0',
      points: -5,
    })
    expect(entry.source).toEqual({ kind: 'manual', reason: 'Attendance error' })
    expect(entry.corrects).toBe('e0')
    expect(entry.ruleId).toBeNull()
  })
  it('maps a season-end source', () => {
    expect(
      toLegacyEntry({ ...entryRow, source: 'season_end', convocation_id: null, season_id: 's1' }).source,
    ).toEqual({ kind: 'season_end', seasonId: 's1' })
  })
  it('rejects an unknown source', () => {
    expect(() => toLegacyEntry({ ...entryRow, source: 'unknown' })).toThrow()
  })
})

describe('toLegacyRule', () => {
  it('maps every column', () => {
    const row: LegacyRuleRow = {
      id: 'r1',
      action: 'training_attendance',
      team_type: 'football',
      channel: 'automatic',
      points_kind: 'fixed',
      points: 5,
      max_points: null,
      reason_required: false,
      valid_from: '2026-08-01',
      valid_to: null,
    }
    expect(toLegacyRule(row)).toEqual({
      id: 'r1',
      action: 'training_attendance',
      teamType: 'football',
      channel: 'automatic',
      pointsKind: 'fixed',
      points: 5,
      maxPoints: null,
      reasonRequired: false,
      validFrom: '2026-08-01',
      validTo: null,
    })
  })
})

describe('toLegacyRule — points_catchup', () => {
  it('maps the variable manual catch-up rule', () => {
    const row: LegacyRuleRow = {
      id: 'r2',
      action: 'points_catchup',
      team_type: null,
      channel: 'manual',
      points_kind: 'variable',
      points: null,
      max_points: 300,
      reason_required: true,
      valid_from: '2024-07-01',
      valid_to: null,
    }
    expect(toLegacyRule(row)).toMatchObject({
      action: 'points_catchup',
      teamType: null,
      channel: 'manual',
      pointsKind: 'variable',
      points: null,
      maxPoints: 300,
      reasonRequired: true,
    })
  })
})

describe('toLegacyManualEntryInsertRow', () => {
  it('maps a manual award to a manual-source row and nothing else', () => {
    expect(
      toLegacyManualEntryInsertRow({
        userId: 'u1',
        ruleId: 'r1',
        points: 15,
        reason: 'Parrainage',
        earnedOn: '2026-10-01',
        createdBy: 'admin-1',
      }),
    ).toEqual({
      user_id: 'u1',
      points: 15,
      rule_id: 'r1',
      source: 'manual',
      reason: 'Parrainage',
      earned_on: '2026-10-01',
      created_by: 'admin-1',
    })
  })
})
