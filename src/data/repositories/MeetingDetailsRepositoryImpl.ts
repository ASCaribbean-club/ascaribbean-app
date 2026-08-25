import type { SupabaseClient } from '@supabase/supabase-js'
import type { MeetingDetails } from '@domain/entities/meeting-details'
import type { MeetingDetailsRepository } from '@domain/repositories/meeting-details-repository'

// TODO (specs/create-convocation.md §2): implement against
// public.meeting_details once that migration exists. Stubbed so
// CreateConvocationUseCase / GetConvocationDetailsUseCase have something
// concrete to wire against in the DI container — see
// presentation/di/containers/convocation-container.ts.
export class MeetingDetailsRepositoryImpl implements MeetingDetailsRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async upsert(_details: MeetingDetails): Promise<MeetingDetails> {
    // TODO: `.from('meeting_details').upsert(toMeetingDetailsRow(_details))
    // .select().single()`, map back with toMeetingDetails. Upsert on
    // `convocation_id` (the primary key) — CLAUDE.md §6, "current state"
    // table, not append-only.
    throw new Error('Not implemented')
  }

  async findByConvocationId(_convocationId: string): Promise<MeetingDetails | null> {
    // TODO: `.maybeSingle()` — a meeting with an empty agenda still has a
    // row (§2: "Liste vide acceptée à la soumission"), but a convocation
    // whose creation hasn't finished writing this satellite yet should not
    // throw here.
    throw new Error('Not implemented')
  }
}