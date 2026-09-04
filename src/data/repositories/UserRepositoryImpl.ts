import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@domain/entities/user'
import type { UserRepository } from '@domain/repositories/user-repository'
import type { UserRoleRow, UserRow } from '../dto/user-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toUser } from '../mappers/user-mapper'

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
}
