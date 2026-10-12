import type { SupabaseClient } from '@supabase/supabase-js'
import type { ConvocationResponseCountsRepository } from '@domain/repositories/convocation-response-counts-repository'
import type { ResponseCounts } from '@domain/rules/convocation-rules'
import type { ConvocationResponseCountsDto } from '../dto/convocation-response-counts-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { ConvocationResponseCountsMapper } from '../mappers/convocation-response-counts-mapper'

export class ConvocationResponseCountsRepositoryImpl implements ConvocationResponseCountsRepository {
  constructor(private supabaseClient: SupabaseClient) { }

  async countForConvocations(convocationIds: string[]): Promise<Record<string, ResponseCounts>> {
    if (convocationIds.length === 0) return {}

    const { data, error } = await this.supabaseClient.rpc('get_convocation_response_counts', {
      p_convocation_ids: convocationIds,
    })

    if (error) throw mapSupabaseError(error)

    return Object.fromEntries(
      ((data ?? []) as ConvocationResponseCountsDto[]).map((dto) => [dto.convocation_id, ConvocationResponseCountsMapper.toDomain(dto)]),
    )
  }
}
