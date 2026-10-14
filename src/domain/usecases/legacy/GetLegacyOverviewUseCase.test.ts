import { describe, expect, it } from 'vitest'
import type { LegacyEntry, LegacyPointsMode, LegacyRewardGrant, LegacyTier } from '@domain/entities/legacy'
import type { Season } from '@domain/entities/season'
import type { LegacyRepository } from '@domain/repositories/legacy-repository'
import type { SeasonRepository } from '@domain/repositories/season-repository'
import { GetLegacyOverviewUseCase, LEGACY_RECENT_ENTRIES_COUNT } from './GetLegacyOverviewUseCase'

const SEASON: Season = {
  id: 's1',
  label: '2026-2027',
  startDate: '2026-08-01',
  endDate: '2027-07-31',
  cotisationAmount: null,
  paymentUrl: null,
}

const TIERS: LegacyTier[] = [
  ['Bronze', 1, 200],
  ['Argent', 2, 400],
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

function entry(id: string, points: number, earnedOn: string): LegacyEntry {
  return {
    id,
    userId: 'u1',
    points,
    ruleId: 'r1',
    source: { kind: 'convocation', convocationId: 'c1' },
    corrects: null,
    earnedOn,
    createdAt: `${earnedOn}T10:00:00Z`,
    createdBy: null,
  }
}

function build(options: {
  season?: Season | null
  mode?: LegacyPointsMode | null
  tiers?: LegacyTier[]
  entries?: LegacyEntry[]
  grants?: LegacyRewardGrant[]
  seniority?: number
}) {
  const legacy = {
    findEntries: async () => options.entries ?? [],
    findRewardGrants: async () => options.grants ?? [],
    getSeniority: async () => options.seniority ?? 0,
    findSeasonMode: async () => (options.mode === undefined ? 'cumulative' : options.mode),
    findTiers: async () => options.tiers ?? TIERS,
    findRules: async () => [],
  } as unknown as LegacyRepository
  const seasons = {
    findCurrent: async () => (options.season === undefined ? SEASON : options.season),
  } as unknown as SeasonRepository
  return new GetLegacyOverviewUseCase(legacy, seasons)
}

describe('GetLegacyOverviewUseCase', () => {
  it('computes balance, tier status and the reward to hand over', async () => {
    const overview = await build({
      entries: [entry('e1', 150, '2026-09-01'), entry('e2', 100, '2026-10-01')],
      seniority: 1,
    }).execute({ userId: 'u1' })

    expect(overview.configured).toBe(true)
    expect(overview.balance).toBe(250)
    expect(overview.tierStatus.currentTier?.name).toBe('Bronze')
    expect(overview.rewards).toEqual([{ tier: TIERS[0], state: 'to_hand_over' }])
  })

  it('marks a granted reward as handed over and lists grants of every season', async () => {
    const grants: LegacyRewardGrant[] = [
      {
        id: 'g0', userId: 'u1', tierId: 'old', seasonId: 's0', rewardLabel: 'Old',
        grantedBy: null, grantedAt: '2025-10-01T10:00:00Z', note: null,
      },
      {
        id: 'g1', userId: 'u1', tierId: 't1', seasonId: 's1', rewardLabel: 'Reward Bronze',
        grantedBy: null, grantedAt: '2026-11-01T10:00:00Z', note: null,
      },
    ]
    const overview = await build({ entries: [entry('e1', 250, '2026-09-01')], seniority: 1, grants }).execute({
      userId: 'u1',
    })

    expect(overview.rewards[0].state).toBe('handed_over')
    expect(overview.grants).toHaveLength(2)
  })

  it('honours the per-season mode', async () => {
    const overview = await build({
      mode: 'per_season',
      entries: [entry('old', 500, '2025-10-01'), entry('now', 40, '2026-10-01')],
      seniority: 2,
    }).execute({ userId: 'u1' })

    expect(overview.balance).toBe(40)
    expect(overview.tierStatus.currentTier).toBeNull()
  })

  it('reports a season with no settings as not configured (PO-LG-16)', async () => {
    const overview = await build({ mode: null, entries: [entry('e1', 300, '2026-09-01')], seniority: 1 }).execute({
      userId: 'u1',
    })

    expect(overview.configured).toBe(false)
    expect(overview.tierStatus.configured).toBe(false)
    expect(overview.rewards).toEqual([])
  })

  it('treats a gap between seasons as not configured', async () => {
    const overview = await build({ season: null }).execute({ userId: 'u1' })
    expect(overview.season).toBeNull()
    expect(overview.configured).toBe(false)
  })

  it('returns the most recent entries only', async () => {
    const entries = Array.from({ length: LEGACY_RECENT_ENTRIES_COUNT + 3 }, (_, i) =>
      entry(`e${i}`, 5, `2026-09-${String(i + 1).padStart(2, '0')}`),
    )
    const overview = await build({ entries }).execute({ userId: 'u1' })

    expect(overview.recentEntries).toHaveLength(LEGACY_RECENT_ENTRIES_COUNT)
    expect(overview.recentEntries[0].id).toBe(`e${LEGACY_RECENT_ENTRIES_COUNT + 2}`)
  })
})
