import type {
  LegacyEntry,
  NewLegacyManualEntry,
  LegacyPointsMode,
  LegacyRewardGrant,
  LegacyRule,
  LegacyTier,
  LegacyTierInput,
} from '@domain/entities/legacy'

// docs/specs/asc-legacy.md §5 — read side of the Legacy module ('legacy:read_own',
// RLS: own ledger rows and grants; rules, season settings and tiers are
// reference data readable by every authenticated user). The ledger is
// append-only (PO-LG-01): there is deliberately no update or delete method.
export interface LegacyRepository {
  // The whole référentiel, every version — also backs the "how to earn points"
  // page (PO-LG-21). Resolution by date is resolveRule's job, not the query's.
  findRules(): Promise<LegacyRule[]>

  // null = the season has no Legacy settings yet (PO-LG-16: not configured).
  findSeasonMode(seasonId: string): Promise<LegacyPointsMode | null>

  findTiers(seasonId: string): Promise<LegacyTier[]>

  // 'legacy:manage_tiers' (admin) — writes the tier set on the CURRENT season and
  // every future one in one call (past seasons keep theirs); an existing rank is
  // updated in place, a new rank is added, nothing is deleted. Returns how many
  // seasons were written. SaveLegacyTiersUseCase is the only caller.
  saveTiers(tiers: LegacyTierInput[]): Promise<number>

  // 'legacy:manage_tiers' (admin) — sets the mode of one season (creating its
  // settings row if needed): last-value-wins configuration, not a ledger. Switching it changes no data
  // (PO-LG-06). SetLegacySeasonModeUseCase is the only caller.
  setSeasonMode(seasonId: string, mode: LegacyPointsMode): Promise<void>

  // Every entry of one member, all seasons (the balance depends on the mode).
  findEntries(userId: string): Promise<LegacyEntry[]>

  // Every entry of every member (backoffice list, 'legacy:read_any': RLS lets
  // the admin and the Dirigeant habilité read them all; anyone else gets only
  // their own rows).
  findAllEntries(): Promise<LegacyEntry[]>

  // 'legacy:award' — inserts ONE manual entry (RLS legacy_points_entries_insert_award).
  // The ledger is append-only: this is the only write on it. AwardLegacyPointsUseCase
  // is the only caller.
  addManualEntry(entry: NewLegacyManualEntry): Promise<LegacyEntry>

  // Every grant of one member, all seasons (PO-LG-20).
  findRewardGrants(userId: string): Promise<LegacyRewardGrant[]>

  // computeSeniority's SQL mirror (public.legacy_seniority): distinct seasons
  // with an active, non-archived membership.
  getSeniority(userId: string): Promise<number>
}
