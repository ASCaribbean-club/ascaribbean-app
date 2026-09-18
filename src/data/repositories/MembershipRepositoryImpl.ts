import type { SupabaseClient } from '@supabase/supabase-js'
import type { Membership } from '@domain/entities/membership'
import type { CreateMembershipInput, MembershipRepository, UpdateMembershipInput } from '@domain/repositories/membership-repository'
import type { MembershipRow } from '@data/dto/membership-dto'
import { mapSupabaseError } from '@data/errors/map-supabase-error'
import { toMembership, toMembershipInsertRow, toMembershipUpdateRow } from '@data/mappers/membership-mapper'

const MEMBERSHIP_COLUMNS = 'id, user_id, licence_number, status, season_id, valid_until, archived_at, archived_by, amount_due_cents'

export class MembershipRepositoryImpl implements MembershipRepository {
  constructor(private readonly client: SupabaseClient) {}

  // memberships_select_own already scopes this to the caller's own row (or
  // admin) — see supabase/migrations/20260811171754_initial_schema.sql.
  // maybeSingle(), not single(): a member with no row for this season
  // (e.g. not yet registered) is a valid, expected zero-row state.
  //
  // specs/web-memberships.md §2.5/AC-WM-28 — the `.is('archived_at', null)`
  // filter is added here, IN ADDITION to memberships_select_own's own
  // amended RLS branch (supabase/migrations/20260917174652_web_memberships_write_policies.sql):
  // defense in depth for an admin+player multi-role account reading THEIR
  // OWN row through this same method, where the RLS admin branch does not
  // itself exclude archived rows.
  async findForUserAndSeason(userId: string, seasonId: string): Promise<Membership | null> {
    const { data, error } = await this.client
      .from('memberships')
      .select(MEMBERSHIP_COLUMNS)
      .eq('user_id', userId)
      .eq('season_id', seasonId)
      .is('archived_at', null)
      .maybeSingle<MembershipRow>()

    if (error) throw mapSupabaseError(error)
    return data ? toMembership(data) : null
  }

  // specs/web-memberships.md §2.10/AC-WM-19/AC-WM-22 — the /admin/memberships
  // admin list. No season filter (client-side, §2.6b) — only the
  // archived_at exclusion (§2.5).
  async findAllForAdmin(): Promise<Membership[]> {
    const { data, error } = await this.client
      .from('memberships')
      .select(MEMBERSHIP_COLUMNS)
      .is('archived_at', null)
      .overrideTypes<MembershipRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toMembership)
  }

  // specs/web-memberships.md §2.7/PO-WM-03 — backs CreateMembershipUseCase's
  // "recreate after archive" check. maybeSingle(): the partial unique index
  // (memberships_user_season_active_idx) only constrains LIVE rows, so more
  // than one ARCHIVED row could in principle exist for the same pair over
  // time — this deliberately picks whichever one Postgres returns first
  // rather than ordering by archived_at, since there is no requirement (or
  // even a screen) that distinguishes between multiple archived
  // generations in this pass (§2.5, "aucun écran ne permette de revoir les
  // archives").
  async findArchivedForUserAndSeason(userId: string, seasonId: string): Promise<Membership | null> {
    const { data, error } = await this.client
      .from('memberships')
      .select(MEMBERSHIP_COLUMNS)
      .eq('user_id', userId)
      .eq('season_id', seasonId)
      .not('archived_at', 'is', null)
      .limit(1)
      .maybeSingle<MembershipRow>()

    if (error) throw mapSupabaseError(error)
    return data ? toMembership(data) : null
  }

  // memberships_insert_admin (RLS) — mirrors 'membership:write'. A
  // duplicate (user_id, season_id) live row surfaces as
  // DuplicateMembershipError via map-supabase-error.ts, never pre-checked
  // here (TOCTOU, §2.4).
  async create(input: CreateMembershipInput): Promise<Membership> {
    const { data, error } = await this.client
      .from('memberships')
      .insert(toMembershipInsertRow(input))
      .select(MEMBERSHIP_COLUMNS)
      .single()
      .overrideTypes<MembershipRow>()

    if (error) throw mapSupabaseError(error)
    return toMembership(data)
  }

  // memberships_update_admin (RLS) — mirrors 'membership:write'.
  async update(id: string, input: UpdateMembershipInput): Promise<Membership> {
    const { data, error } = await this.client
      .from('memberships')
      .update(toMembershipUpdateRow(input))
      .eq('id', id)
      .select(MEMBERSHIP_COLUMNS)
      .single()
      .overrideTypes<MembershipRow>()

    if (error) throw mapSupabaseError(error)
    return toMembership(data)
  }

  // specs/web-memberships.md §2.7/PO-WM-03 — the ONE implemented reading of
  // "remplacer" (R1): same UPDATE payload as update() above, PLUS resetting
  // archived_at/archived_by to null in the same write — single row, same
  // id, goes through the SAME memberships_update_admin RLS policy (an
  // archive is itself just an UPDATE, §2.5, so un-archiving is too).
  async replaceArchived(id: string, input: CreateMembershipInput): Promise<Membership> {
    const { data, error } = await this.client
      .from('memberships')
      .update({ ...toMembershipUpdateRow(input), archived_at: null, archived_by: null })
      .eq('id', id)
      .select(MEMBERSHIP_COLUMNS)
      .single()
      .overrideTypes<MembershipRow>()

    if (error) throw mapSupabaseError(error)
    return toMembership(data)
  }

  // memberships_update_admin (RLS) — archiving IS an update of archived_at/
  // archived_by, never a DELETE (§2.5, AC-WM-05).
  async archive(id: string, actorId: string): Promise<Membership> {
    const { data, error } = await this.client
      .from('memberships')
      .update({ archived_at: new Date().toISOString(), archived_by: actorId })
      .eq('id', id)
      .select(MEMBERSHIP_COLUMNS)
      .single()
      .overrideTypes<MembershipRow>()

    if (error) throw mapSupabaseError(error)
    return toMembership(data)
  }

  // specs/web-memberships.md §2.8 — the nav badge's dedicated, LIGHT read:
  // a `head: true, count: 'exact'` request returns only a row count, never
  // the rows themselves (never the full admin list loaded to count
  // client-side). Counts 'pending'-status, non-archived memberships for one
  // season — see CountMembershipsRequiringAttentionUseCase's own comment on
  // why this reading was picked (PO-WM-06).
  async countPendingForSeason(seasonId: string): Promise<number> {
    const { count, error } = await this.client
      .from('memberships')
      .select('id', { count: 'exact', head: true })
      .eq('season_id', seasonId)
      .eq('status', 'pending')
      .is('archived_at', null)

    if (error) throw mapSupabaseError(error)
    return count ?? 0
  }
}
