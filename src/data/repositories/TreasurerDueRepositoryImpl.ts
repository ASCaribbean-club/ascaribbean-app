import type { SupabaseClient } from '@supabase/supabase-js'
import type { TreasurerDue } from '@domain/entities/treasurer-due'
import type { TreasurerDueRepository } from '@domain/repositories/treasurer-due-repository'
import type { TreasurerDueDto } from '../dto/treasurer-due-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toTreasurerDue } from '../mappers/treasurer-due-mapper'

// `get_treasurer_dues` — supabase/migrations/20261005130000_get_treasurer_dues_rpc.sql.
// Rule name: dues:read. The function's own role check (treasurer,
// authorized-officer or admin, else 42501) is the real boundary; memberships, users and user_roles
// are never read row by row from the client.
export class TreasurerDueRepositoryImpl implements TreasurerDueRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listCurrentSeasonDues(): Promise<TreasurerDue[]> {
    const { data, error } = await this.client.rpc('get_treasurer_dues')

    if (error) throw mapSupabaseError(error)
    return ((data ?? []) as TreasurerDueDto[]).map(toTreasurerDue)
  }
}
