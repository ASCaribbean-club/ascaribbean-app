import type { SupabaseClient } from '@supabase/supabase-js'
import type { ConvocationAttendeeRepository } from '@domain/repositories/convocation-attendee-repository'
import type { ConvocationAttendeeRow } from '../dto/convocation-attendee-row'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toConvocationAttendeeRow } from '../mappers/convocation-attendee-mapper'

// `public.convocation_attendees` —
// supabase/migrations/20261012181248_convocation_attendees_schema.sql.
export class ConvocationAttendeeRepositoryImpl implements ConvocationAttendeeRepository {
  constructor(private readonly client: SupabaseClient) {}

  // Plain insert under the RLS policy convocation_attendees_insert_add
  // ('convocation_attendee:add'). The team-player trigger and the 14-cap
  // trigger of an official match refuse an invalid write (23514), the policy
  // refuses a non-coach / a closed convocation / a past kickoff (42501) —
  // all translated by mapSupabaseError. No upsert: the list is only ever
  // appended to, a duplicate is a primary-key violation surfaced as such.
  async add(convocationId: string, userId: string): Promise<void> {
    const { error } = await this.client.from('convocation_attendees').insert(toConvocationAttendeeRow(convocationId, userId))

    if (error) throw mapSupabaseError(error)
  }

  async listConvokedConvocationIds(userId: string, convocationIds: string[]): Promise<string[]> {
    if (convocationIds.length === 0) return []

    const { data, error } = await this.client
      .from('convocation_attendees')
      .select('convocation_id')
      .eq('user_id', userId)
      .in('convocation_id', convocationIds)
      .overrideTypes<Pick<ConvocationAttendeeRow, 'convocation_id'>[]>()

    if (error) throw mapSupabaseError(error)

    return (data ?? []).map((row) => row.convocation_id)
  }
}
