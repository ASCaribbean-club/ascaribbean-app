import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@domain/entities/user'
import type { UserRepository, UserSummary } from '@domain/repositories/user-repository'
import type { UserRoleRow, UserRow, UserSummaryRow } from '../dto/user-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toUser, toUserSummary } from '../mappers/user-mapper'

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
}
