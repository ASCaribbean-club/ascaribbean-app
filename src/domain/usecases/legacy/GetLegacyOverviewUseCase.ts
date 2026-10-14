import type { LegacyEntry, LegacyPointsMode, LegacyRewardGrant, LegacyRule, LegacyTier } from '@domain/entities/legacy'
import type { Season } from '@domain/entities/season'
import {
  computeBalance,
  computeTierStatus,
  isSeasonConfigured,
  rewardsStatus,
  type RewardStatus,
  type TierStatus,
} from '@domain/policies/legacy-rules'
import type { LegacyRepository } from '@domain/repositories/legacy-repository'
import type { SeasonRepository } from '@domain/repositories/season-repository'

// PO-LG-22 — number of recent entries on the main screen. One named constant,
// never a literal repeated elsewhere.
export const LEGACY_RECENT_ENTRIES_COUNT = 5

export interface GetLegacyOverviewInput {
  userId: string
}

export interface LegacyOverview {
  season: Season | null
  mode: LegacyPointsMode | null
  configured: boolean
  balance: number
  seniority: number
  tierStatus: TierStatus
  // The season's tiers, ordered by rank — the screen derives "prochaines récompenses" from them.
  tiers: LegacyTier[]
  // Every rule version, to label an entry from its rule's action.
  rules: LegacyRule[]
  // Tiers reached in the current season, each "to hand over" or "handed over".
  rewards: RewardStatus[]
  // PO-LG-20 — every grant the member received, all seasons.
  grants: LegacyRewardGrant[]
  recentEntries: LegacyEntry[]
}

// docs/specs/asc-legacy.md §6.1 — everything the player screen shows. Balance,
// seniority and tier status are derived at read time, never stored (PO-LG-01,
// PO-LG-07). Plain async function over repositories: no React, no Supabase.
export class GetLegacyOverviewUseCase {
  constructor(
    private readonly legacyRepository: LegacyRepository,
    private readonly seasonRepository: SeasonRepository,
  ) {}

  async execute({ userId }: GetLegacyOverviewInput): Promise<LegacyOverview> {
    const [season, entries, grants, seniority, rules] = await Promise.all([
      this.seasonRepository.findCurrent(),
      this.legacyRepository.findEntries(userId),
      this.legacyRepository.findRewardGrants(userId),
      this.legacyRepository.getSeniority(userId),
      this.legacyRepository.findRules(),
    ])

    const [mode, unorderedTiers] = season
      ? await Promise.all([
          this.legacyRepository.findSeasonMode(season.id),
          this.legacyRepository.findTiers(season.id),
        ])
      : [null, []]
    const tiers = [...unorderedTiers].sort((a, b) => a.rank - b.rank)

    // PO-LG-16 — an unconfigured season (or a gap between seasons) shows
    // "not configured": no tier status, the balance falls back to the plain sum.
    const configured = season !== null && isSeasonConfigured(mode, tiers)
    const balance = computeBalance(
      entries,
      configured && mode ? mode : 'cumulative',
      season ?? { startDate: '', endDate: '' },
    )
    const tierStatus = computeTierStatus(tiers, balance, seniority, configured)
    const currentRank = tierStatus.currentTier?.rank ?? 0
    const rewards = rewardsStatus(
      tiers.filter((t) => t.rank <= currentRank),
      grants,
    )

    const recentEntries = [...entries]
      .sort((a, b) => b.earnedOn.localeCompare(a.earnedOn) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, LEGACY_RECENT_ENTRIES_COUNT)

    return { season, mode, configured, balance, seniority, tierStatus, tiers, rules, rewards, grants, recentEntries }
  }
}
