// Raw shapes of the Legacy tables — see
// supabase/migrations/20261013134443_legacy_schema.sql.

export interface LegacyRuleRow {
  id: string
  action: string
  team_type: string | null
  channel: string
  points_kind: string
  points: number | null
  max_points: number | null
  reason_required: boolean
  valid_from: string
  valid_to: string | null
}

export interface LegacySeasonSettingsRow {
  season_id: string
  points_mode: string
}

export interface LegacyTierRow {
  id: string
  season_id: string
  rank: number
  name: string
  min_seasons: number
  min_points: number
  reward_label: string
  discount_percent: number
  discount_lifetime: boolean
}

export interface LegacyPointsEntryRow {
  id: string
  user_id: string
  points: number
  rule_id: string | null
  source: string
  convocation_id: string | null
  season_id: string | null
  reason: string | null
  corrects: string | null
  earned_on: string
  created_at: string
  created_by: string | null
}

export interface LegacyRewardGrantRow {
  id: string
  user_id: string
  tier_id: string
  season_id: string
  reward_label: string
  granted_by: string | null
  granted_at: string
  note: string | null
}

// Element of the jsonb array save_legacy_tiers() takes (an RPC argument, not a
// table row, hence Dto) — see supabase/migrations/20261014140749_legacy_tiers_propagation.sql.
export interface LegacyTierPayloadDto {
  rank: number
  name: string
  min_seasons: number
  min_points: number
  reward_label: string
  discount_percent: number
  discount_lifetime: boolean
}

// Insert payload of a MANUAL ledger entry — see legacy_points_entries_insert_award
// (supabase/migrations/20261013134443_legacy_schema.sql). source is always
// 'manual'; id, created_at and every other source column are left to the database.
export interface LegacyManualEntryInsertRow {
  user_id: string
  points: number
  rule_id: string
  source: 'manual'
  reason: string
  earned_on: string
  created_by: string
}
