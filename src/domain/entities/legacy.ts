import type { SectionType } from '@domain/entities/section'

// docs/specs/asc-legacy.md §1 — closed vocabulary of the barème. Mirrors the
// legacy_rules_action_check constraint (supabase/migrations/20261013134443_legacy_schema.sql).
export const LEGACY_ACTIONS = [
  'training_attendance',
  'match_attendance_official',
  'match_attendance_friendly',
  'event_participation',
  'equipment_setup',
  'club_mission',
  'referral',
  'solidarity_action',
  'partner_contribution',
  'exceptional_commitment',
  'season_end_bonus',
  // docs/specs/legacy-points-catchup.md PO-LPC-01 — manual, variable 1..300.
  'points_catchup',
] as const

export type LegacyAction = (typeof LEGACY_ACTIONS)[number]

export type LegacyChannel = 'automatic' | 'manual'
export type LegacyPointsKind = 'fixed' | 'variable'
export type LegacyPointsMode = 'cumulative' | 'per_season'

// §3.1 — one row per version of (action, team type). Dates are ISO dates
// (YYYY-MM-DD) and both validity boundaries are INCLUSIVE; validTo null = current.
export interface LegacyRule {
  id: string
  action: LegacyAction
  teamType: SectionType | null // null for manual rules and season_end_bonus
  channel: LegacyChannel
  pointsKind: LegacyPointsKind
  points: number | null // fixed rule
  maxPoints: number | null // variable rule (minimum: see legacyMinimumPoints)
  reasonRequired: boolean
  validFrom: string
  validTo: string | null
}

// PO-LG-05 — discriminated union, every switch on it ends with a `never` check.
// 'season_end' is the third source: the automatic season_end_bonus (PO-LG-26).
export type LegacyEntrySource =
  | { kind: 'convocation'; convocationId: string | null } // null once the convocation is deleted (PO-LG-23)
  | { kind: 'manual'; reason: string }
  | { kind: 'season_end'; seasonId: string }

// §3.2 — append-only ledger entry; `points` is a signed snapshot.
export interface LegacyEntry {
  id: string
  userId: string
  points: number
  ruleId: string | null // null for a pure correction
  source: LegacyEntrySource
  corrects: string | null
  earnedOn: string // date of the fact, drives season attribution
  createdAt: string
  createdBy: string | null
}

// §3.4
export interface LegacyTier {
  id: string
  seasonId: string
  rank: number
  name: string
  minSeasons: number
  minPoints: number
  rewardLabel: string
  discountPercent: number
  discountLifetime: boolean
}

// What the admin edits: a tier minus the identity the database gives it. Tiers
// are written once for the current season and every future one (the backoffice
// "ASC Legacy" tab), so the input carries no season.
export type LegacyTierInput = Omit<LegacyTier, 'id' | 'seasonId'>

// A manual award as the admin submits it (spec §4.9). createdBy is the acting
// account: RLS requires it to equal auth.uid().
export interface NewLegacyManualEntry {
  userId: string
  ruleId: string
  points: number
  reason: string
  earnedOn: string
  createdBy: string
}

// §3.5
export interface LegacyRewardGrant {
  id: string
  userId: string
  tierId: string
  seasonId: string
  rewardLabel: string
  grantedBy: string | null
  grantedAt: string
  note: string | null
}
