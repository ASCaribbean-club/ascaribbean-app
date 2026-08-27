import type { SupabaseClient } from '@supabase/supabase-js'
import type { ConvocationResponse } from '@domain/entities/convocation'
import type { ConvocationResponseRepository } from '@domain/repositories/convocation-response-repository'
import type { ConvocationResponseRow } from '../dto/convocation-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toConvocationResponse } from '../mappers/convocation-mapper'

export class ConvocationResponseRepositoryImpl implements ConvocationResponseRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async findByConvocation(convocationId: string): Promise<ConvocationResponse[]> {
    const { data, error } = await this.client
      .from('convocation_responses')
      .select('id, convocation_id, user_id, status, reason, responded_at')
      .eq('convocation_id', convocationId)
      .overrideTypes<ConvocationResponseRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toConvocationResponse)
  }

  // Not exercised by coach-dashboard (read-only screen, CLAUDE.md's own
  // "hors périmètre" — see specs/coach-dashboard.md §1). Left unimplemented
  // here rather than guessed: belongs to the feature that owns a player's
  // convocation response submission, which should decide the upsert
  // conflict target (CLAUDE.md §6: upsert-on-conflict, not insert-and-grow).
  async upsert(): Promise<ConvocationResponse> {
    throw new Error('not implemented — owned by the convocation response feature, not coach-dashboard')
  }

  async findByConvocationAndUser(): Promise<ConvocationResponse | null> {
    throw new Error('not implemented — owned by the convocation response feature, not coach-dashboard')
  }
}
