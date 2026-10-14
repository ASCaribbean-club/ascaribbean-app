import type {
  LegacyAction,
  LegacyChannel,
  LegacyEntry,
  LegacyEntrySource,
  LegacyPointsKind,
  LegacyPointsMode,
  LegacyRewardGrant,
  LegacyRule,
  LegacyTier,
  LegacyTierInput,
  NewLegacyManualEntry,
} from '@domain/entities/legacy'
import type { SectionType } from '@domain/entities/section'
import type {
  LegacyManualEntryInsertRow,
  LegacyPointsEntryRow,
  LegacyTierPayloadDto,
  LegacyRewardGrantRow,
  LegacyRuleRow,
  LegacyTierRow,
} from '../dto/legacy-dto'

// The string columns are guarded by CHECK constraints (legacy_schema.sql), so
// the casts below only reflect what the database already enforces.
export function toLegacyRule(row: LegacyRuleRow): LegacyRule {
  return {
    id: row.id,
    action: row.action as LegacyAction,
    teamType: row.team_type as SectionType | null,
    channel: row.channel as LegacyChannel,
    pointsKind: row.points_kind as LegacyPointsKind,
    points: row.points,
    maxPoints: row.max_points,
    reasonRequired: row.reason_required,
    validFrom: row.valid_from,
    validTo: row.valid_to,
  }
}

export function toLegacyPointsMode(value: string): LegacyPointsMode {
  return value as LegacyPointsMode
}

export function toLegacyTier(row: LegacyTierRow): LegacyTier {
  return {
    id: row.id,
    seasonId: row.season_id,
    rank: row.rank,
    name: row.name,
    minSeasons: row.min_seasons,
    minPoints: row.min_points,
    rewardLabel: row.reward_label,
    discountPercent: row.discount_percent,
    discountLifetime: row.discount_lifetime,
  }
}

// PO-LG-05 — one nullable FK per source type, rebuilt here as the domain's
// discriminated union. The source_shape CHECK guarantees the matching column
// is present (convocation_id may be null once the convocation is deleted,
// PO-LG-23).
function toLegacyEntrySource(row: LegacyPointsEntryRow): LegacyEntrySource {
  switch (row.source) {
    case 'convocation':
      return { kind: 'convocation', convocationId: row.convocation_id }
    case 'manual':
      return { kind: 'manual', reason: row.reason ?? '' }
    case 'season_end':
      return { kind: 'season_end', seasonId: row.season_id ?? '' }
    default:
      throw new Error(`Unknown legacy entry source: ${row.source}`)
  }
}

export function toLegacyEntry(row: LegacyPointsEntryRow): LegacyEntry {
  return {
    id: row.id,
    userId: row.user_id,
    points: row.points,
    ruleId: row.rule_id,
    source: toLegacyEntrySource(row),
    corrects: row.corrects,
    earnedOn: row.earned_on,
    createdAt: row.created_at,
    createdBy: row.created_by,
  }
}

export function toLegacyRewardGrant(row: LegacyRewardGrantRow): LegacyRewardGrant {
  return {
    id: row.id,
    userId: row.user_id,
    tierId: row.tier_id,
    seasonId: row.season_id,
    rewardLabel: row.reward_label,
    grantedBy: row.granted_by,
    grantedAt: row.granted_at,
    note: row.note,
  }
}

export function toLegacyTierPayload(tier: LegacyTierInput): LegacyTierPayloadDto {
  return {
    rank: tier.rank,
    name: tier.name.trim(),
    min_seasons: tier.minSeasons,
    min_points: tier.minPoints,
    reward_label: tier.rewardLabel.trim(),
    discount_percent: tier.discountPercent,
    discount_lifetime: tier.discountLifetime,
  }
}

export function toLegacyManualEntryInsertRow(entry: NewLegacyManualEntry): LegacyManualEntryInsertRow {
  return {
    user_id: entry.userId,
    points: entry.points,
    rule_id: entry.ruleId,
    source: 'manual',
    reason: entry.reason,
    earned_on: entry.earnedOn,
    created_by: entry.createdBy,
  }
}
