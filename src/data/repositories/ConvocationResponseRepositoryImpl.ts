import type { SupabaseClient } from '@supabase/supabase-js'
import type { ConvocationResponse } from '@domain/entities/convocation'
import type { ConvocationResponseRepository } from '@domain/repositories/convocation-response-repository'
import type { ConvocationResponseRow } from '../dto/convocation-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toConvocationResponse, toConvocationResponseRow } from '../mappers/convocation-mapper'

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

  async upsert(response: Omit<ConvocationResponse, 'id'>): Promise<ConvocationResponse> {
    const { data, error } = await this.client
      .from('convocation_responses')
      .upsert(toConvocationResponseRow(response), { onConflict: 'convocation_id,user_id' })
      .select()
      .single<ConvocationResponseRow>()

    if (error) throw mapSupabaseError(error)

    return toConvocationResponse(data as ConvocationResponseRow)
  }

  async findByConvocationAndUser(convocationId: string, userId: string): Promise<ConvocationResponse | null> {
    const { data, error } = await this.client
      .from('convocation_responses')
      .select('id, convocation_id, user_id, status, reason, responded_at')
      .eq('convocation_id', convocationId)
      .eq('user_id', userId)
      .maybeSingle<ConvocationResponseRow>()

    if (error) throw mapSupabaseError(error)
    return data ? toConvocationResponse(data) : null
  }
}
