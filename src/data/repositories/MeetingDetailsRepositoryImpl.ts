import type { SupabaseClient } from '@supabase/supabase-js'
import type { MeetingDetails } from '@domain/entities/meeting-details'
import type { MeetingDetailsRepository } from '@domain/repositories/meeting-details-repository'
import { toMeetingDetails, toMeetingDetailsRow } from '@data/mappers/meeting-details-mapper'
import type { MeetingDetailsRow } from '@data/dto/meeting-details-dto'
import { mapSupabaseError } from '@data/errors/map-supabase-error'

export class MeetingDetailsRepositoryImpl implements MeetingDetailsRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async upsert(details: MeetingDetails): Promise<MeetingDetails> {
    const { data, error } = await this.client
      .from('meeting_details')
      .upsert(toMeetingDetailsRow(details), {
        onConflict: 'convocation_id'
      })
      .select()
      .single()

    if (error) throw mapSupabaseError(error)

    return toMeetingDetails(data as MeetingDetailsRow)
  }

  async findByConvocationId(convocationId: string): Promise<MeetingDetails | null> {
    // `.maybeSingle()`, not `.single()` — a meeting convocation with no
    // MeetingDetails row yet is a valid `null`, same convention as
    // MatchDetailsRepositoryImpl.
    const { data, error } = await this.client
      .from('meeting_details')
      .select('convocation_id, title, agenda')
      .eq('convocation_id', convocationId)
      .maybeSingle<MeetingDetailsRow>()

    if (error) throw mapSupabaseError(error)
    if (!data) return null

    return toMeetingDetails(data as MeetingDetailsRow)
  }
}