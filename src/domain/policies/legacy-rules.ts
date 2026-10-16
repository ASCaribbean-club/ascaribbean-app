import type { CompetitionType } from '@domain/entities/competition-type'
import type { ConvocationType } from '@domain/entities/convocation'
import type {
  LegacyAction,
  LegacyChannel,
  LegacyEntry,
  LegacyPointsMode,
  LegacyRewardGrant,
  LegacyRule,
  LegacyTier,
  LegacyTierInput,
} from '@domain/entities/legacy'
import type { SectionType } from '@domain/entities/section'
import { InvalidLegacyInputError } from '@domain/errors/invalid-legacy-input-error'
import { LegacyPointsOutOfRangeError } from '@domain/errors/legacy-points-out-of-range-error'
import { LegacyReasonRequiredError } from '@domain/errors/legacy-reason-required-error'

/**
 * ASC Legacy reference rules (docs/specs/asc-legacy.md §4).
 * ⚠️ DUPLICATED in SQL, by hand (CLAUDE.md §7) — SQL is authoritative in
 * production; these functions exist so the rules are readable and testable in
 * Node. Counterparts, all in supabase/migrations/20261013134916_legacy_closure_and_reconciliation.sql
 * unless noted:
 *   actionForConvocation           private.legacy_action_for_convocation
 *   resolveRule                    private.legacy_resolve_convocation_rule
 *   expectedConvocationAwards      private.reconcile_convocation_awards (CTE `expected`)
 *   reconcileConvocationAwards     private.reconcile_convocation_awards (CTE `deltas`)
 *   isSeasonConfigured             private.legacy_season_is_configured
 *   computeSeniority               public.legacy_seniority (20261013134443_legacy_schema.sql)
 *   validateManualAward            private.legacy_manual_award_is_valid + RLS legacy_points_entries_insert_award
 *   legacyMinimumPoints            private.legacy_manual_award_is_valid (minimum of points_catchup),
 *                                  supabase/migrations/20261016100000_legacy_points_catchup.sql
 *   validateCorrection             private.legacy_correction_target_matches + RLS legacy_points_entries_insert_correct
 * computeBalance, computeTierStatus and rewardsStatus have no SQL mirror: the
 * balance and tier status are derived at read time and never stored (PO-LG-01).
 *
 * Dates are ISO dates (YYYY-MM-DD) compared as strings, boundaries INCLUSIVE.
 */

// §4.1 — a match with a missing or unknown type returns no action: it is never
// read as official (same reason as AC-MS-07).
export function actionForConvocation(
  type: ConvocationType,
  competitionType: CompetitionType | null | undefined,
): LegacyAction | null {
  switch (type) {
    case 'training':
      return 'training_attendance'
    case 'meeting':
      return 'event_participation'
    case 'match':
      if (competitionType === 'official') return 'match_attendance_official'
      if (competitionType === 'friendly') return 'match_attendance_friendly'
      return null
    default: {
      const unreachable: never = type
      return unreachable
    }
  }
}

function isValidOn(rule: LegacyRule, date: string): boolean {
  return rule.validFrom <= date && (rule.validTo === null || date <= rule.validTo)
}

export type RuleValidity = 'current' | 'ended' | 'upcoming'

// Where a rule version stands relative to `today` (inclusive boundaries, same
// convention as resolveRule). Display only: awards always resolve on earnedOn.
export function ruleValidityOn(rule: LegacyRule, today: string): RuleValidity {
  if (rule.validFrom > today) return 'upcoming'
  return isValidOn(rule, today) ? 'current' : 'ended'
}

// The manual rules an officer can pick for a fact dated `earnedOn` (spec §6.2):
// manual channel, valid at that date. Every manual rule is offered, whatever the
// member's sections (PO-LG-23).
export function manualRulesValidOn(rules: LegacyRule[], earnedOn: string): LegacyRule[] {
  return rules.filter((r) => r.channel === 'manual' && isValidOn(r, earnedOn))
}

// §4.2 — the version valid AT `earnedOn`, never the latest. Automatic by
// default (what closure resolves); pass 'manual' to look up a manual rule.
export function resolveRule(
  rules: LegacyRule[],
  action: LegacyAction,
  teamType: SectionType | null,
  earnedOn: string,
  channel: LegacyChannel = 'automatic',
): LegacyRule | null {
  return (
    rules.find(
      (r) =>
        r.action === action &&
        r.channel === channel &&
        r.teamType === teamType &&
        isValidOn(r, earnedOn),
    ) ?? null
  )
}

export interface ConvocationForAwards {
  type: ConvocationType
  competitionType: CompetitionType | null
  teamType: SectionType
  earnedOn: string
}

export interface AttendanceForAwards {
  userId: string
  actualStatus: string
}

export type UnresolvedReason = 'no_action' | 'no_rule'

export interface ExpectedAwards {
  ruleId: string | null
  pointsByUser: Record<string, number>
  // Set when nothing could be awarded although the convocation closed, so the
  // Administrateur can see it (PO-LG-02, AC-LG-12).
  unresolved: UnresolvedReason | null
}

// §4.3 — only the coach-confirmed `present` counts; the player's
// ConvocationResponse is never an input (AC-LG-13).
export function expectedConvocationAwards(
  convocation: ConvocationForAwards,
  attendance: AttendanceForAwards[],
  rules: LegacyRule[],
): ExpectedAwards {
  const action = actionForConvocation(convocation.type, convocation.competitionType)
  if (action === null) return { ruleId: null, pointsByUser: {}, unresolved: 'no_action' }

  const rule = resolveRule(rules, action, convocation.teamType, convocation.earnedOn)
  if (rule === null || rule.points === null) {
    return { ruleId: null, pointsByUser: {}, unresolved: 'no_rule' }
  }

  const pointsByUser: Record<string, number> = {}
  for (const record of attendance) {
    if (record.actualStatus === 'present') pointsByUser[record.userId] = rule.points
  }
  return { ruleId: rule.id, pointsByUser, unresolved: null }
}

export interface AwardedEntry {
  userId: string
  points: number
  source: LegacyEntry['source']
}

export interface AwardDelta {
  userId: string
  points: number
}

// §4.4 — delta = expected − already awarded BY THIS CONVOCATION, zero rows
// dropped. Only convocation-source entries count as "already awarded": a manual
// correction is neither counted nor undone (AC-LG-15).
export function reconcileConvocationAwards(
  expected: Record<string, number>,
  alreadyAwarded: AwardedEntry[],
): AwardDelta[] {
  const awarded: Record<string, number> = {}
  for (const entry of alreadyAwarded) {
    if (entry.source.kind !== 'convocation') continue
    awarded[entry.userId] = (awarded[entry.userId] ?? 0) + entry.points
  }

  const userIds = new Set([...Object.keys(expected), ...Object.keys(awarded)])
  const deltas: AwardDelta[] = []
  for (const userId of userIds) {
    const delta = (expected[userId] ?? 0) - (awarded[userId] ?? 0)
    if (delta !== 0) deltas.push({ userId, points: delta })
  }
  return deltas
}

export interface SeasonRange {
  startDate: string
  endDate: string
}

// §4.5 — cumulative: sum of every entry; per_season: entries whose `earnedOn`
// falls in the season (inclusive), never the creation date.
export function computeBalance(
  entries: Pick<LegacyEntry, 'points' | 'earnedOn'>[],
  mode: LegacyPointsMode,
  season: SeasonRange,
): number {
  return entries
    .filter(
      (e) =>
        mode === 'cumulative' || (season.startDate <= e.earnedOn && e.earnedOn <= season.endDate),
    )
    .reduce((sum, e) => sum + e.points, 0)
}

export interface MembershipForSeniority {
  seasonId: string
  status: 'pending' | 'active' | 'suspended'
  archivedAt: string | null
}

// §4.6 — distinct seasons with an `active`, non-archived membership
// (PO-LG-14, PO-LG-25).
export function computeSeniority(memberships: MembershipForSeniority[]): number {
  return new Set(
    memberships.filter((m) => m.status === 'active' && m.archivedAt === null).map((m) => m.seasonId),
  ).size
}

export interface TierStatus {
  configured: boolean
  currentTier: LegacyTier | null
  nextTier: LegacyTier | null
  missingPoints: number
  missingSeasons: number
  maxReached: boolean
}

// PO-LG-16 — a season counts points only once its mode AND tiers are set.
export function isSeasonConfigured(mode: LegacyPointsMode | null, tiers: LegacyTier[]): boolean {
  return mode !== null && tiers.length > 0
}

// §4.7 — a tier needs BOTH thresholds: points alone never unlock one.
export function computeTierStatus(
  tiers: LegacyTier[],
  points: number,
  seniority: number,
  configured: boolean,
): TierStatus {
  if (!configured || tiers.length === 0) {
    return {
      configured: false,
      currentTier: null,
      nextTier: null,
      missingPoints: 0,
      missingSeasons: 0,
      maxReached: false,
    }
  }

  const ordered = [...tiers].sort((a, b) => a.rank - b.rank)
  const reached = ordered.filter((t) => points >= t.minPoints && seniority >= t.minSeasons)
  const currentTier = reached.length > 0 ? reached[reached.length - 1] : null
  const nextTier = ordered.find((t) => currentTier === null || t.rank > currentTier.rank) ?? null

  return {
    configured: true,
    currentTier,
    nextTier,
    missingPoints: nextTier ? Math.max(0, nextTier.minPoints - points) : 0,
    missingSeasons: nextTier ? Math.max(0, nextTier.minSeasons - seniority) : 0,
    maxReached: nextTier === null,
  }
}

export type RewardStatus =
  | { tier: LegacyTier; state: 'to_hand_over' }
  | { tier: LegacyTier; state: 'handed_over'; grantedAt: string }

// §4.8 — one grant per (user, tier, season): a grant in another season does not
// count as handed over.
export function rewardsStatus(
  tiersReached: LegacyTier[],
  grants: Pick<LegacyRewardGrant, 'tierId' | 'seasonId' | 'grantedAt'>[],
): RewardStatus[] {
  return tiersReached.map((tier) => {
    const grant = grants.find((g) => g.tierId === tier.id && g.seasonId === tier.seasonId)
    return grant
      ? { tier, state: 'handed_over', grantedAt: grant.grantedAt }
      : { tier, state: 'to_hand_over' }
  })
}

export interface ManualAwardInput {
  rule: LegacyRule
  points: number
  reason: string
  earnedOn: string
}

// docs/specs/legacy-points-catchup.md PO-LPC-02 — the minimum of a variable
// rule is 0 (exceptional_commitment, 0..50) except `points_catchup`, which is
// 1..300 (a 0-point catch-up is meaningless). Rule-specific branch rather than a
// generic column, so no schema change on legacy_rules.
// SQL mirror: private.legacy_manual_award_is_valid (points_catchup -> minimum 1).
export function legacyMinimumPoints(rule: Pick<LegacyRule, 'action'>): number {
  return rule.action === 'points_catchup' ? 1 : 0
}

// §4.9 — there is no input path that creates points without a manual rule
// (PO-LG-08); a reason is mandatory on every manual award (PO-LG-19).
export function validateManualAward({ rule, points, reason, earnedOn }: ManualAwardInput): void {
  if (rule.channel !== 'manual') {
    throw new InvalidLegacyInputError('This rule cannot be awarded manually')
  }
  if (!isValidOn(rule, earnedOn)) {
    throw new InvalidLegacyInputError('This rule is not valid at the date of the fact')
  }
  if (!Number.isInteger(points)) {
    if (rule.pointsKind === 'variable') {
      throw new LegacyPointsOutOfRangeError(rule.action, legacyMinimumPoints(rule), rule.maxPoints ?? 0)
    }
    throw new InvalidLegacyInputError('Points must be an integer')
  }
  if (rule.pointsKind === 'fixed' && points !== rule.points) {
    throw new InvalidLegacyInputError("Points must match the rule's fixed value")
  }
  if (
    rule.pointsKind === 'variable' &&
    (points < legacyMinimumPoints(rule) || points > (rule.maxPoints ?? 0))
  ) {
    throw new LegacyPointsOutOfRangeError(rule.action, legacyMinimumPoints(rule), rule.maxPoints ?? 0)
  }
  if (reason.trim().length === 0) {
    throw new LegacyReasonRequiredError('A reason is required')
  }
}

export interface CorrectionInput {
  target: Pick<LegacyEntry, 'userId'>
  userId: string
  points: number
  reason: string
}

// §4.10 — no cap and no floor beyond non-zero (PO-LG-16); reason mandatory.
export function validateCorrection({ target, userId, points, reason }: CorrectionInput): void {
  if (target.userId !== userId) {
    throw new InvalidLegacyInputError('A correction must target an entry of the same member')
  }
  if (!Number.isInteger(points) || points === 0) {
    throw new InvalidLegacyInputError('A correction must be a non-zero integer')
  }
  if (reason.trim().length === 0) {
    throw new InvalidLegacyInputError('A reason is required')
  }
}

// Admin tier set (backoffice "ASC Legacy" tab). A tier needs both thresholds, so
// the ladder must be coherent: ranks are 1..n with no gap, names and reward
// labels are filled, and a higher rank never asks for fewer points or seasons
// than the one below (otherwise it could be reached without the lower tier).
// Table CHECKs and uniques (legacy_tiers) enforce the rest in SQL — see
// supabase/migrations/20261014140749_legacy_tiers_propagation.sql.
export function validateLegacyTiers(tiers: LegacyTierInput[]): void {
  if (tiers.length === 0) {
    throw new InvalidLegacyInputError('At least one tier is required')
  }

  const ordered = [...tiers].sort((a, b) => a.rank - b.rank)
  const names = new Set<string>()

  ordered.forEach((tier, index) => {
    if (tier.rank !== index + 1) {
      throw new InvalidLegacyInputError('Tier ranks must be consecutive, starting at 1')
    }
    if (tier.name.trim().length === 0 || tier.rewardLabel.trim().length === 0) {
      throw new InvalidLegacyInputError('Every tier needs a name and a reward')
    }
    const key = tier.name.trim().toLowerCase()
    if (names.has(key)) {
      throw new InvalidLegacyInputError('Tier names must be unique')
    }
    names.add(key)

    if (!Number.isInteger(tier.minPoints) || tier.minPoints < 0 || !Number.isInteger(tier.minSeasons) || tier.minSeasons < 0) {
      throw new InvalidLegacyInputError('Thresholds must be non-negative integers')
    }
    if (!Number.isInteger(tier.discountPercent) || tier.discountPercent < 0 || tier.discountPercent > 100) {
      throw new InvalidLegacyInputError('The discount must be between 0 and 100')
    }

    const below = ordered[index - 1]
    if (below && (tier.minPoints < below.minPoints || tier.minSeasons < below.minSeasons)) {
      throw new InvalidLegacyInputError('A higher tier cannot require fewer points or seasons than the one below')
    }
  })
}
