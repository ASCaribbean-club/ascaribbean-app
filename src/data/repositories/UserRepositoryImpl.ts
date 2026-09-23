import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@domain/entities/user'
import type { MissingElementFacts } from '@domain/policies/user-completeness'
import type {
  AdminUserDirectoryEntry,
  InvitationLink,
  InviteUserInput,
  UserMissingElementFactsEntry,
  UserRepository,
  UserSummary,
} from '@domain/repositories/user-repository'
import type { InviteUserRequestDto, InviteUserResponseDto } from '../dto/invite-user-dto'
import type {
  AdminUserRoleRow,
  AdminUserRow,
  MembershipCompletenessFactRow,
  UserCharterFactRow,
  UserRoleOwnerRow,
  UserRoleRow,
  UserRow,
  UserSummaryRow,
} from '../dto/user-dto'
import { mapInviteFunctionError } from '../errors/map-invite-function-error'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toAdminUserDirectoryEntry, toMissingElementFacts, toUser, toUserSummary } from '../mappers/user-mapper'

export class UserRepositoryImpl implements UserRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async findById(id: string): Promise<User | null> {
    const { data: userRow, error: userError } = await this.client
      .from('users')
      .select('id, full_name, email, charter_accepted_at, position')
      .eq('id', id)
      .maybeSingle<UserRow>()

    if (userError) throw mapSupabaseError(userError)
    if (!userRow) return null

    const { data: roleRows, error: rolesError } = await this.client
      .from('user_roles')
      .select('role, team_id, section_id')
      .eq('user_id', id)
      .overrideTypes<UserRoleRow[]>()

    if (rolesError) throw mapSupabaseError(rolesError)

    return toUser(userRow, roleRows ?? [])
  }

  // No userId parameter here even though UserRepository.acceptCharter
  // declares one — accept_charter() operates on auth.uid() from the session
  // JWT (see the RPC's doc comment in
  // supabase/migrations/20260813075127_charter_acceptance.sql), and a
  // narrower-arity method still satisfies the interface structurally. The
  // parameter stays in the domain signature so callers don't need to know
  // that Supabase detail.
  async acceptCharter(): Promise<void> {
    const { error } = await this.client.rpc('accept_charter')
    if (error) throw mapSupabaseError(error)
  }

  // specs/section-and-teams.md §2.11/PO-ST-12b — admin-only directory read,
  // backed by users_select_own's existing `or private.is_admin()` branch
  // (no new RLS policy). For a non-admin caller this silently narrows to
  // their own single row — never called from a non-admin screen.
  async findAll(): Promise<UserSummary[]> {
    const { data, error } = await this.client.from('users').select('id, full_name, email').overrideTypes<UserSummaryRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toUserSummary)
  }

  // specs/web-users.md §2.2/§2.10/AC-WU-11/AC-WU-20 — /admin/users' own
  // table read. `roles` stays id-only (team/section NAME resolution is the
  // ViewModel's job, composing the SAME teamsAdminList/sectionsAdminList
  // reads useAssignCoachDialogViewModel already warms, see
  // AdminUserDirectoryEntry's own comment) — no TeamRepository/
  // SectionRepository dependency added here (interface segregation, same
  // reasoning as every other repository in this codebase). `missingElementFacts`
  // is computed by the SAME internal helper findMissingElementFacts() below
  // calls, never a second, divergent computation (AC-WU-17).
  async findAdminDirectory(currentSeasonId: string | null): Promise<AdminUserDirectoryEntry[]> {
    const { data: userRows, error: userError } = await this.client
      .from('users')
      .select('id, full_name, email, charter_accepted_at')
      .overrideTypes<AdminUserRow[]>()
    if (userError) throw mapSupabaseError(userError)

    const { data: roleRows, error: roleError } = await this.client
      .from('user_roles')
      .select('user_id, role, team_id, section_id')
      .overrideTypes<AdminUserRoleRow[]>()
    if (roleError) throw mapSupabaseError(roleError)

    const factsByUserId = await this.fetchMissingElementFactsByUserId(currentSeasonId)

    const roleRowsByUserId = new Map<string, UserRoleRow[]>()
    for (const row of roleRows ?? []) {
      const bucket = roleRowsByUserId.get(row.user_id)
      if (bucket) bucket.push(row)
      else roleRowsByUserId.set(row.user_id, [row])
    }

    return (userRows ?? []).map((row) =>
      toAdminUserDirectoryEntry(row, roleRowsByUserId.get(row.id) ?? [], factsByUserId.get(row.id) ?? EMPTY_MISSING_ELEMENT_FACTS),
    )
  }

  // specs/web-users.md §2.3/§2.8/AC-WU-17 — the nav badge's own dedicated,
  // LIGHT read: facts only, never the full directory above loaded and
  // counted client-side.
  async findMissingElementFacts(currentSeasonId: string | null): Promise<UserMissingElementFactsEntry[]> {
    const factsByUserId = await this.fetchMissingElementFactsByUserId(currentSeasonId)
    return Array.from(factsByUserId.entries()).map(([userId, facts]) => ({ userId, facts }))
  }

  // Shared by findAdminDirectory() and findMissingElementFacts() above — the
  // SAME three narrow reads back both (AC-WU-17: the row icon and the nav
  // badge must never diverge on a corner case).
  private async fetchMissingElementFactsByUserId(currentSeasonId: string | null): Promise<Map<string, MissingElementFacts>> {
    const { data: userRows, error: userError } = await this.client
      .from('users')
      .select('id, charter_accepted_at')
      .overrideTypes<UserCharterFactRow[]>()
    if (userError) throw mapSupabaseError(userError)

    const { data: roleOwnerRows, error: roleError } = await this.client
      .from('user_roles')
      .select('user_id')
      .overrideTypes<UserRoleOwnerRow[]>()
    if (roleError) throw mapSupabaseError(roleError)
    const userIdsWithRole = new Set((roleOwnerRows ?? []).map((row) => row.user_id))

    // §2.3 "repli" — criteria 2/3 are unevaluable (never an error) when no
    // season is current: the membership query is simply skipped, every
    // account's membershipRow stays undefined, and toMissingElementFacts()
    // itself turns currentSeasonId === null into `false` for both.
    let membershipRows: MembershipCompletenessFactRow[] = []
    if (currentSeasonId !== null) {
      const { data, error } = await this.client
        .from('memberships')
        .select('user_id, licence_number')
        .eq('season_id', currentSeasonId)
        .is('archived_at', null)
        .overrideTypes<MembershipCompletenessFactRow[]>()
      if (error) throw mapSupabaseError(error)
      membershipRows = data ?? []
    }
    const membershipRowByUserId = new Map(membershipRows.map((row) => [row.user_id, row]))

    const factsByUserId = new Map<string, MissingElementFacts>()
    for (const userRow of userRows ?? []) {
      factsByUserId.set(
        userRow.id,
        toMissingElementFacts(userRow, userIdsWithRole.has(userRow.id), membershipRowByUserId.get(userRow.id), currentSeasonId),
      )
    }
    return factsByUserId
  }

  // specs/web-users.md §2.7/AC-WU-38 — users_update_admin (RLS), mirrors
  // 'user:write'. Writes full_name ONLY — the policy's own `grant update
  // (full_name)` makes any other column structurally unwritable regardless
  // of what this call sends, but the call itself only ever sends this one
  // column too (defence in depth at this layer as well).
  async updateFullName(userId: string, fullName: string): Promise<void> {
    const { error } = await this.client.from('users').update({ full_name: fullName }).eq('id', userId)
    if (error) throw mapSupabaseError(error)
  }

  // specs/web-users-invitation-links.md §2/AC-WU-03/AC-WU-34 — the ONLY
  // place in this codebase's client-reachable code that talks to the
  // invite-user Edge Function; it never sees a service_role key (that key
  // lives exclusively inside the function's own server-side environment).
  // mapInviteFunctionError() reads the function's own JSON error body — see
  // that file's own comment on why supabase.functions.invoke()'s thrown
  // error needs its own translation path, distinct from mapSupabaseError().
  // Returns the activation link — never stored, never logged, handed
  // straight back to the ViewModel for Copier/Partager (§1.6/§4).
  async invite(input: InviteUserInput): Promise<InvitationLink> {
    const body: InviteUserRequestDto = { mode: 'create', fullName: input.fullName, email: input.email }
    const { data, error } = await this.client.functions.invoke<InviteUserResponseDto>('invite-user', { body })
    if (error) throw await mapInviteFunctionError(error)
    return { url: data!.url }
  }

  // specs/web-users-invitation-links.md §2 — ReissueInvitationLinkUseCase
  // is the only caller. Same function, mode 'reissue': no public.users row
  // to create, the account already exists.
  async reissueInvitationLink(userId: string): Promise<InvitationLink> {
    const body: InviteUserRequestDto = { mode: 'reissue', userId }
    const { data, error } = await this.client.functions.invoke<InviteUserResponseDto>('invite-user', { body })
    if (error) throw await mapInviteFunctionError(error)
    return { url: data!.url }
  }
}

// specs/web-users.md §2.3 "repli" — the facts an account gets when it has
// no row of its own in fetchMissingElementFactsByUserId's userRows read
// (unreachable in practice: every public.users row is included in that
// unfiltered select, so every findAdminDirectory() row always has a match) —
// kept as an explicit, honest fallback rather than a non-null assertion.
const EMPTY_MISSING_ELEMENT_FACTS: MissingElementFacts = {
  hasRole: false,
  hasMembershipForCurrentSeason: false,
  hasLicenceNumberForCurrentSeason: false,
  charterAccepted: false,
}
