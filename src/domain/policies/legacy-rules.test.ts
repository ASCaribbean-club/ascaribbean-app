import { describe, expect, it } from 'vitest'
import type { LegacyRule, LegacyTier, LegacyTierInput } from '@domain/entities/legacy'
import { InvalidLegacyInputError } from '@domain/errors/invalid-legacy-input-error'
import { LegacyPointsOutOfRangeError } from '@domain/errors/legacy-points-out-of-range-error'
import { LegacyReasonRequiredError } from '@domain/errors/legacy-reason-required-error'
import {
  actionForConvocation,
  computeBalance,
  computeSeniority,
  computeTierStatus,
  expectedConvocationAwards,
  reconcileConvocationAwards,
  manualRulesValidOn,
  resolveRule,
  ruleValidityOn,
  rewardsStatus,
  validateCorrection,
  validateLegacyTiers,
  validateManualAward,
  legacyMinimumPoints,
} from './legacy-rules'

function rule(overrides: Partial<LegacyRule> = {}): LegacyRule {
  return {
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
    ...overrides,
  }
}

function manualRule(overrides: Partial<LegacyRule> = {}): LegacyRule {
  return rule({
    id: 'm1',
    action: 'referral',
    teamType: null,
    channel: 'manual',
    points: 15,
    reasonRequired: true,
    ...overrides,
  })
}

const TIERS: LegacyTier[] = [
  ['Bronze', 1, 200],
  ['Argent', 2, 400],
  ['Or', 3, 600],
  ['Émeraude', 5, 1000],
  ['Rubis', 7, 1400],
  ['Platine', 10, 2500],
].map(([name, minSeasons, minPoints], i) => ({
  id: `t${i + 1}`,
  seasonId: 's1',
  rank: i + 1,
  name: name as string,
  minSeasons: minSeasons as number,
  minPoints: minPoints as number,
  rewardLabel: `Reward ${name}`,
  discountPercent: 5,
  discountLifetime: false,
}))

describe('actionForConvocation', () => {
  it('maps a training', () => {
    expect(actionForConvocation('training', null)).toBe('training_attendance')
  })
  it('maps a meeting', () => {
    expect(actionForConvocation('meeting', null)).toBe('event_participation')
  })
  it('maps an official match', () => {
    expect(actionForConvocation('match', 'official')).toBe('match_attendance_official')
  })
  it('maps a friendly match', () => {
    expect(actionForConvocation('match', 'friendly')).toBe('match_attendance_friendly')
  })
  it('returns no action for a match with a missing type — never official', () => {
    expect(actionForConvocation('match', null)).toBeNull()
    expect(actionForConvocation('match', undefined)).toBeNull()
  })
})

describe('resolveRule', () => {
  const v1 = rule({ id: 'v1', points: 5, validTo: '2026-12-31' })
  const v2 = rule({ id: 'v2', points: 8, validFrom: '2027-01-01' })

  it('matches exactly', () => {
    expect(resolveRule([v1], 'training_attendance', 'football', '2026-10-01')).toBe(v1)
  })
  it('returns none for another team type only', () => {
    expect(resolveRule([v1], 'training_attendance', 'esport', '2026-10-01')).toBeNull()
  })
  it('returns none before valid_from', () => {
    expect(resolveRule([v1], 'training_attendance', 'football', '2026-07-31')).toBeNull()
  })
  it('returns none after a closed valid_to', () => {
    expect(resolveRule([v1], 'training_attendance', 'football', '2027-01-01')).toBeNull()
  })
  it('returns the version valid at the date, not the latest', () => {
    expect(resolveRule([v1, v2], 'training_attendance', 'football', '2026-10-01')).toBe(v1)
    expect(resolveRule([v1, v2], 'training_attendance', 'football', '2027-02-01')).toBe(v2)
  })
  it('treats both boundary days as inclusive', () => {
    expect(resolveRule([v1], 'training_attendance', 'football', '2026-08-01')).toBe(v1)
    expect(resolveRule([v1], 'training_attendance', 'football', '2026-12-31')).toBe(v1)
  })
  it('only resolves automatic rules by default', () => {
    expect(resolveRule([manualRule()], 'referral', null, '2026-10-01')).toBeNull()
    expect(resolveRule([manualRule()], 'referral', null, '2026-10-01', 'manual')).not.toBeNull()
  })
})

describe('expectedConvocationAwards', () => {
  const training = {
    type: 'training' as const,
    competitionType: null,
    teamType: 'football' as const,
    earnedOn: '2026-10-01',
  }

  it('awards the rule points to a present player', () => {
    const res = expectedConvocationAwards(training, [{ userId: 'u1', actualStatus: 'present' }], [rule()])
    expect(res.pointsByUser).toEqual({ u1: 5 })
    expect(res.ruleId).toBe('r1')
    expect(res.unresolved).toBeNull()
  })
  it('awards nothing to an absent player, whatever they answered', () => {
    const res = expectedConvocationAwards(training, [{ userId: 'u1', actualStatus: 'absent' }], [rule()])
    expect(res.pointsByUser).toEqual({})
  })
  it('signals an unresolved convocation when no rule matches', () => {
    const res = expectedConvocationAwards(
      { ...training, teamType: 'esport' },
      [{ userId: 'u1', actualStatus: 'present' }],
      [rule()],
    )
    expect(res.pointsByUser).toEqual({})
    expect(res.unresolved).toBe('no_rule')
  })
  it('signals no_action for a match without a type', () => {
    const res = expectedConvocationAwards(
      { ...training, type: 'match' },
      [{ userId: 'u1', actualStatus: 'present' }],
      [rule()],
    )
    expect(res.unresolved).toBe('no_action')
  })
  it('uses the rule valid at the date of a retroactive convocation', () => {
    const v1 = rule({ id: 'v1', points: 5, validTo: '2026-12-31' })
    const v2 = rule({ id: 'v2', points: 8, validFrom: '2027-01-01' })
    const res = expectedConvocationAwards(training, [{ userId: 'u1', actualStatus: 'present' }], [v1, v2])
    expect(res.pointsByUser).toEqual({ u1: 5 })
  })
})

describe('reconcileConvocationAwards', () => {
  const conv = { kind: 'convocation', convocationId: 'c1' } as const

  it('inserts one entry per present user on first closure', () => {
    expect(reconcileConvocationAwards({ u1: 5, u2: 5 }, [])).toEqual([
      { userId: 'u1', points: 5 },
      { userId: 'u2', points: 5 },
    ])
  })
  it('is idempotent', () => {
    expect(reconcileConvocationAwards({ u1: 5 }, [{ userId: 'u1', points: 5, source: conv }])).toEqual([])
  })
  it('writes a negative compensating entry when a present user becomes absent', () => {
    expect(reconcileConvocationAwards({}, [{ userId: 'u1', points: 5, source: conv }])).toEqual([
      { userId: 'u1', points: -5 },
    ])
  })
  it('writes a positive delta for the reverse change', () => {
    const awarded = [
      { userId: 'u1', points: 5, source: conv },
      { userId: 'u1', points: -5, source: conv },
    ]
    expect(reconcileConvocationAwards({ u1: 5 }, awarded)).toEqual([{ userId: 'u1', points: 5 }])
  })
  it('never counts nor undoes a manual correction', () => {
    const awarded = [
      { userId: 'u1', points: 5, source: conv },
      { userId: 'u1', points: -5, source: { kind: 'manual', reason: 'error' } as const },
    ]
    expect(reconcileConvocationAwards({ u1: 5 }, awarded)).toEqual([])
  })
  it('backfill over N convocations equals N closures', () => {
    const run = (ids: string[]) => ids.flatMap((id) => reconcileConvocationAwards({ [`u-${id}`]: 5 }, []))
    expect(run(['a', 'b', 'c'])).toHaveLength(3)
  })
})

describe('computeBalance', () => {
  const entries = [
    { points: 100, earnedOn: '2025-10-01' },
    { points: 50, earnedOn: '2026-10-01' },
    { points: 20, earnedOn: '2026-07-15' }, // gap between seasons
  ]
  const season = { startDate: '2026-08-01', endDate: '2027-07-31' }

  it('differs between modes on the same data', () => {
    expect(computeBalance(entries, 'cumulative', season)).toBe(170)
    expect(computeBalance(entries, 'per_season', season)).toBe(50)
  })
  it('counts a gap entry in cumulative mode only', () => {
    expect(computeBalance([entries[2]], 'cumulative', season)).toBe(20)
    expect(computeBalance([entries[2]], 'per_season', season)).toBe(0)
  })
  it('attributes a correction to the season of its own earnedOn', () => {
    const correction = { points: -5, earnedOn: '2026-09-01' }
    expect(computeBalance([correction], 'per_season', season)).toBe(-5)
  })
  it('keeps snapshots: a rule change does not move the balance', () => {
    expect(computeBalance([{ points: 5, earnedOn: '2026-10-01' }], 'cumulative', season)).toBe(5)
  })
})

describe('computeSeniority', () => {
  it('counts a season once', () => {
    const m = { seasonId: 's1', status: 'active' as const, archivedAt: null }
    expect(computeSeniority([m, { ...m }])).toBe(1)
  })
  it('ignores pending, suspended and archived memberships', () => {
    expect(
      computeSeniority([
        { seasonId: 's1', status: 'pending', archivedAt: null },
        { seasonId: 's2', status: 'suspended', archivedAt: null },
        { seasonId: 's3', status: 'active', archivedAt: '2026-01-01T00:00:00Z' },
      ]),
    ).toBe(0)
  })
})

describe('computeTierStatus', () => {
  it('320 pts / 2 seasons → Bronze, next Argent, 80 missing', () => {
    const s = computeTierStatus(TIERS, 320, 2, true)
    expect(s.currentTier?.name).toBe('Bronze')
    expect(s.nextTier?.name).toBe('Argent')
    expect(s.missingPoints).toBe(80)
    expect(s.missingSeasons).toBe(0)
  })
  it('450 pts / 1 season → Bronze; Argent points met, 1 season missing', () => {
    const s = computeTierStatus(TIERS, 450, 1, true)
    expect(s.currentTier?.name).toBe('Bronze')
    expect(s.nextTier?.name).toBe('Argent')
    expect(s.missingPoints).toBe(0)
    expect(s.missingSeasons).toBe(1)
  })
  it('0 pts / 1 season → no tier, next Bronze', () => {
    const s = computeTierStatus(TIERS, 0, 1, true)
    expect(s.currentTier).toBeNull()
    expect(s.nextTier?.name).toBe('Bronze')
  })
  it('2840 pts / 11 seasons → Platine, max reached', () => {
    const s = computeTierStatus(TIERS, 2840, 11, true)
    expect(s.currentTier?.name).toBe('Platine')
    expect(s.maxReached).toBe(true)
    expect(s.nextTier).toBeNull()
  })
  it('reports a season that is not configured', () => {
    const s = computeTierStatus(TIERS, 500, 3, false)
    expect(s.configured).toBe(false)
    expect(s.currentTier).toBeNull()
  })
})

describe('rewardsStatus', () => {
  const bronze = TIERS[0]
  it('marks a reached tier with no grant as to hand over', () => {
    expect(rewardsStatus([bronze], [])).toEqual([{ tier: bronze, state: 'to_hand_over' }])
  })
  it('marks a granted tier as handed over', () => {
    const grant = { tierId: 't1', seasonId: 's1', grantedAt: '2026-10-01T10:00:00Z' }
    expect(rewardsStatus([bronze], [grant])).toEqual([
      { tier: bronze, state: 'handed_over', grantedAt: grant.grantedAt },
    ])
  })
  it('ignores a grant for the same tier in another season', () => {
    const grant = { tierId: 't1', seasonId: 's0', grantedAt: '2026-10-01T10:00:00Z' }
    expect(rewardsStatus([bronze], [grant])[0].state).toBe('to_hand_over')
  })
})

describe('validateManualAward', () => {
  const base = { points: 15, reason: 'Brought a new member', earnedOn: '2026-10-01' }

  it('accepts a valid fixed award', () => {
    expect(() => validateManualAward({ rule: manualRule(), ...base })).not.toThrow()
  })
  it('rejects an automatic-channel rule', () => {
    expect(() => validateManualAward({ rule: rule(), ...base, points: 5 })).toThrow(InvalidLegacyInputError)
  })
  it('rejects a rule not valid at the date', () => {
    expect(() => validateManualAward({ rule: manualRule({ validTo: '2026-09-01' }), ...base })).toThrow(
      InvalidLegacyInputError,
    )
  })
  it('rejects overriding the points of a fixed rule', () => {
    expect(() => validateManualAward({ rule: manualRule(), ...base, points: 20 })).toThrow(InvalidLegacyInputError)
  })
  it('bounds a variable rule to 0..max', () => {
    const variable = manualRule({
      action: 'exceptional_commitment',
      pointsKind: 'variable',
      points: null,
      maxPoints: 50,
    })
    expect(() => validateManualAward({ rule: variable, ...base, points: 50 })).not.toThrow()
    expect(() => validateManualAward({ rule: variable, ...base, points: 51 })).toThrow(InvalidLegacyInputError)
    expect(() => validateManualAward({ rule: variable, ...base, points: -1 })).toThrow(InvalidLegacyInputError)
  })
  it('keeps 0 valid for exceptional_commitment (AC-LPC-10)', () => {
    const variable = manualRule({ action: 'exceptional_commitment', pointsKind: 'variable', points: null, maxPoints: 50 })
    expect(() => validateManualAward({ rule: variable, ...base, points: 0 })).not.toThrow()
  })
  it('bounds points_catchup to 1..300 (AC-LPC-03, AC-LPC-11)', () => {
    const catchup = manualRule({ action: 'points_catchup', pointsKind: 'variable', points: null, maxPoints: 300 })
    expect(() => validateManualAward({ rule: catchup, ...base, points: 0 })).toThrow(LegacyPointsOutOfRangeError)
    expect(() => validateManualAward({ rule: catchup, ...base, points: 1 })).not.toThrow()
    expect(() => validateManualAward({ rule: catchup, ...base, points: 300 })).not.toThrow()
    expect(() => validateManualAward({ rule: catchup, ...base, points: 301 })).toThrow(LegacyPointsOutOfRangeError)
    expect(() => validateManualAward({ rule: catchup, ...base, points: -5 })).toThrow(LegacyPointsOutOfRangeError)
    expect(() => validateManualAward({ rule: catchup, ...base, points: 1.5 })).toThrow(LegacyPointsOutOfRangeError)
  })
  it('refuses a blank reason on points_catchup with a dedicated error (AC-LPC-04)', () => {
    const catchup = manualRule({ action: 'points_catchup', pointsKind: 'variable', points: null, maxPoints: 300 })
    expect(() => validateManualAward({ rule: catchup, ...base, points: 10, reason: ' ' })).toThrow(LegacyReasonRequiredError)
  })
  it('refuses a catch-up dated before the rule valid_from', () => {
    const catchup = manualRule({ action: 'points_catchup', pointsKind: 'variable', points: null, maxPoints: 300, validFrom: '2026-08-01' })
    expect(() => validateManualAward({ rule: catchup, ...base, points: 10, earnedOn: '2026-07-31' })).toThrow(InvalidLegacyInputError)
    expect(() => validateManualAward({ rule: catchup, ...base, points: 10, earnedOn: '2026-08-01' })).not.toThrow()
  })
  it('rejects an empty reason on any manual rule', () => {
    expect(() => validateManualAward({ rule: manualRule(), ...base, reason: '   ' })).toThrow(
      InvalidLegacyInputError,
    )
  })
})

describe('legacyMinimumPoints', () => {
  it('is 1 for points_catchup and 0 for every other action', () => {
    expect(legacyMinimumPoints({ action: 'points_catchup' })).toBe(1)
    expect(legacyMinimumPoints({ action: 'exceptional_commitment' })).toBe(0)
  })
})

describe('validateCorrection', () => {
  const base = { target: { userId: 'u1' }, userId: 'u1', points: -5, reason: 'Attendance error' }

  it('accepts a correction without cap or floor', () => {
    expect(() => validateCorrection(base)).not.toThrow()
    expect(() => validateCorrection({ ...base, points: 10000 })).not.toThrow()
  })
  it('rejects an empty reason', () => {
    expect(() => validateCorrection({ ...base, reason: '' })).toThrow(InvalidLegacyInputError)
  })
  it("rejects another member's entry", () => {
    expect(() => validateCorrection({ ...base, userId: 'u2' })).toThrow(InvalidLegacyInputError)
  })
  it('rejects zero points', () => {
    expect(() => validateCorrection({ ...base, points: 0 })).toThrow(InvalidLegacyInputError)
  })
})

describe('validateLegacyTiers', () => {
  const ladder: LegacyTierInput[] = TIERS.map(({ id: _id, seasonId: _seasonId, ...tier }) => tier)

  it('accepts a coherent ladder', () => {
    expect(() => validateLegacyTiers(ladder)).not.toThrow()
  })
  it('rejects an empty ladder', () => {
    expect(() => validateLegacyTiers([])).toThrow(InvalidLegacyInputError)
  })
  it('rejects a gap in the ranks', () => {
    expect(() => validateLegacyTiers([ladder[0], { ...ladder[1], rank: 3 }])).toThrow(InvalidLegacyInputError)
  })
  it('rejects a duplicate name, whatever the case', () => {
    expect(() => validateLegacyTiers([ladder[0], { ...ladder[1], name: ' bronze ' }])).toThrow(InvalidLegacyInputError)
  })
  it('rejects an empty name or reward', () => {
    expect(() => validateLegacyTiers([{ ...ladder[0], name: '  ' }])).toThrow(InvalidLegacyInputError)
    expect(() => validateLegacyTiers([{ ...ladder[0], rewardLabel: '' }])).toThrow(InvalidLegacyInputError)
  })
  it('rejects a higher tier asking for fewer points or fewer seasons', () => {
    expect(() => validateLegacyTiers([ladder[0], { ...ladder[1], minPoints: 100 }])).toThrow(InvalidLegacyInputError)
    expect(() => validateLegacyTiers([ladder[1], { ...ladder[2], rank: 2, minSeasons: 1 }])).toThrow(InvalidLegacyInputError)
  })
  it('rejects negative thresholds and an out-of-range discount', () => {
    expect(() => validateLegacyTiers([{ ...ladder[0], minPoints: -1 }])).toThrow(InvalidLegacyInputError)
    expect(() => validateLegacyTiers([{ ...ladder[0], discountPercent: 101 }])).toThrow(InvalidLegacyInputError)
  })
  it('does not depend on the order it is given', () => {
    expect(() => validateLegacyTiers([ladder[1], ladder[0]])).not.toThrow()
  })
})

describe('ruleValidityOn', () => {
  const closed = rule({ validFrom: '2026-08-01', validTo: '2026-12-31' })

  it('is current on both boundary days', () => {
    expect(ruleValidityOn(closed, '2026-08-01')).toBe('current')
    expect(ruleValidityOn(closed, '2026-12-31')).toBe('current')
  })
  it('is upcoming before valid_from and ended after valid_to', () => {
    expect(ruleValidityOn(closed, '2026-07-31')).toBe('upcoming')
    expect(ruleValidityOn(closed, '2027-01-01')).toBe('ended')
  })
  it('stays current while valid_to is open', () => {
    expect(ruleValidityOn(rule(), '2030-01-01')).toBe('current')
  })
})

describe('manualRulesValidOn', () => {
  it('keeps only manual rules valid at the date', () => {
    const open = manualRule({ id: 'open' })
    const ended = manualRule({ id: 'ended', validTo: '2026-09-01' })
    const later = manualRule({ id: 'later', validFrom: '2027-01-01' })
    const automatic = rule()
    expect(manualRulesValidOn([open, ended, later, automatic], '2026-10-01')).toEqual([open])
  })
})
