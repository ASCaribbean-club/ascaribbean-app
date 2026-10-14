import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  LegacyEntry,
  LegacyPointsMode,
  LegacyRewardGrant,
  LegacyRule,
  LegacyTier,
  LegacyTierInput,
  NewLegacyManualEntry,
} from '@domain/entities/legacy'
import type { LegacyRepository } from '@domain/repositories/legacy-repository'
import type {
  LegacyPointsEntryRow,
  LegacyRewardGrantRow,
  LegacyRuleRow,
  LegacySeasonSettingsRow,
  LegacyTierRow,
} from '../dto/legacy-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import {
  toLegacyEntry,
  toLegacyManualEntryInsertRow,
  toLegacyPointsMode,
  toLegacyRewardGrant,
  toLegacyRule,
  toLegacyTier,
  toLegacyTierPayload,
} from '../mappers/legacy-mapper'

const RULE_COLUMNS =
  'id, action, team_type, channel, points_kind, points, max_points, reason_required, valid_from, valid_to'
const TIER_COLUMNS =
  'id, season_id, rank, name, min_seasons, min_points, reward_label, discount_percent, discount_lifetime'
const ENTRY_COLUMNS =
  'id, user_id, points, rule_id, source, convocation_id, season_id, reason, corrects, earned_on, created_at, created_by'
const GRANT_COLUMNS = 'id, user_id, tier_id, season_id, reward_label, granted_by, granted_at, note'

export class LegacyRepositoryImpl implements LegacyRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  // legacy_rules_select_authenticated (RLS) — reference data.
  async findRules(): Promise<LegacyRule[]> {
    const { data, error } = await this.client
      .from('legacy_rules')
      .select(RULE_COLUMNS)
      .order('valid_from', { ascending: true })
      .overrideTypes<LegacyRuleRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toLegacyRule)
  }

  // legacy_season_settings_select_authenticated. maybeSingle(): a season with
  // no settings row is the valid "not configured" state (PO-LG-16).
  async findSeasonMode(seasonId: string): Promise<LegacyPointsMode | null> {
    const { data, error } = await this.client
      .from('legacy_season_settings')
      .select('season_id, points_mode')
      .eq('season_id', seasonId)
      .maybeSingle()
      .overrideTypes<LegacySeasonSettingsRow>()

    if (error) throw mapSupabaseError(error)
    return data ? toLegacyPointsMode(data.points_mode) : null
  }

  // save_legacy_tiers (SECURITY DEFINER, admin guard inside): fans the tier set
  // out to the current and future seasons atomically.
  async saveTiers(tiers: LegacyTierInput[]): Promise<number> {
    const { data, error } = await this.client.rpc('save_legacy_tiers', { p_tiers: tiers.map(toLegacyTierPayload) })

    if (error) throw mapSupabaseError(error)
    return (data as number | null) ?? 0
  }

  // legacy_season_settings_update_admin / _insert_admin (RLS). Deliberately NOT an
  // upsert: PostgREST's ON CONFLICT DO UPDATE also rewrites season_id, and the
  // column grant only allows UPDATE on points_mode (a setting never moves to
  // another season) — so an upsert is refused with "permission denied". Update
  // first; a season with no settings row yet gets an insert. Admin-only, so the
  // gap between the two calls cannot race with another writer in practice.
  async setSeasonMode(seasonId: string, mode: LegacyPointsMode): Promise<void> {
    const { data, error } = await this.client
      .from('legacy_season_settings')
      .update({ points_mode: mode })
      .eq('season_id', seasonId)
      .select('season_id')

    if (error) throw mapSupabaseError(error)
    if (data && data.length > 0) return

    const { error: insertError } = await this.client
      .from('legacy_season_settings')
      .insert({ season_id: seasonId, points_mode: mode })

    if (insertError) throw mapSupabaseError(insertError)
  }

  // legacy_tiers_select_authenticated.
  async findTiers(seasonId: string): Promise<LegacyTier[]> {
    const { data, error } = await this.client
      .from('legacy_tiers')
      .select(TIER_COLUMNS)
      .eq('season_id', seasonId)
      .order('rank', { ascending: true })
      .overrideTypes<LegacyTierRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toLegacyTier)
  }

  // legacy_points_entries_select_own / _select_any (RLS). The explicit user_id
  // filter matters for an officer, whose policy would otherwise return everyone.
  async findEntries(userId: string): Promise<LegacyEntry[]> {
    const { data, error } = await this.client
      .from('legacy_points_entries')
      .select(ENTRY_COLUMNS)
      .eq('user_id', userId)
      .order('earned_on', { ascending: false })
      .overrideTypes<LegacyPointsEntryRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toLegacyEntry)
  }

  // legacy_points_entries_select_any (RLS): admin / Dirigeant habilité see every row.
  //
  // ⚠️ WARNING — NO PAGINATION: this reads the WHOLE ledger in one request, and
  // the backoffice "Points attribués" tab then filters, aggregates (KPIs) and
  // slices it client-side (LEDGER_PAGE_SIZE only limits what is RENDERED). The
  // ledger is append-only and grows with every closed convocation × present
  // player, and PostgREST caps a response (default 1000 rows): past that cap the
  // list AND its indicators are silently truncated. Before the ledger nears
  // that size, move filtering, paging and the KPIs to the server (filter
  // arguments + offset/keyset pagination on this method, KPIs from an RPC or a
  // view), as AuditLogRepository.list does (AUDIT_LOG_PAGE_SIZE, AC-AU-12).
  async findAllEntries(): Promise<LegacyEntry[]> {
    const { data, error } = await this.client
      .from('legacy_points_entries')
      .select(ENTRY_COLUMNS)
      .order('earned_on', { ascending: false })
      .overrideTypes<LegacyPointsEntryRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toLegacyEntry)
  }

  // legacy_points_entries_insert_award (RLS) — append-only: an insert, never an upsert.
  async addManualEntry(entry: NewLegacyManualEntry): Promise<LegacyEntry> {
    const { data, error } = await this.client
      .from('legacy_points_entries')
      .insert(toLegacyManualEntryInsertRow(entry))
      .select(ENTRY_COLUMNS)
      .single()
      .overrideTypes<LegacyPointsEntryRow>()

    if (error) throw mapSupabaseError(error)
    return toLegacyEntry(data)
  }

  // legacy_reward_grants_select_own / _select_any (RLS).
  async findRewardGrants(userId: string): Promise<LegacyRewardGrant[]> {
    const { data, error } = await this.client
      .from('legacy_reward_grants')
      .select(GRANT_COLUMNS)
      .eq('user_id', userId)
      .order('granted_at', { ascending: false })
      .overrideTypes<LegacyRewardGrantRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toLegacyRewardGrant)
  }

  async getSeniority(userId: string): Promise<number> {
    const { data, error } = await this.client.rpc('legacy_seniority', { p_user_id: userId })

    if (error) throw mapSupabaseError(error)
    return (data as number | null) ?? 0
  }
}
