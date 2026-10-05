import type { SupabaseClient } from '@supabase/supabase-js'
import type { ConvocationResponse } from '@domain/entities/convocation'
import type { ResponseSummary } from '@domain/entities/response-summary'
import type { ConvocationResponseRepository } from '@domain/repositories/convocation-response-repository'
import type { ConvocationResponseRow } from '../dto/convocation-dto'
import type { ResponseSummaryDto } from '../dto/response-summary-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toConvocationResponse, toConvocationResponseRow } from '../mappers/convocation-mapper'
import { toResponseSummary } from '../mappers/response-summary-mapper'

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

  // Short-circuits on an empty array, same as AttendanceRecordRepositoryImpl.findByConvocations.
  async findByConvocations(convocationIds: string[]): Promise<ConvocationResponse[]> {
    if (convocationIds.length === 0) return []

    const { data, error } = await this.client
      .from('convocation_responses')
      .select('id, convocation_id, user_id, status, reason, responded_at')
      .in('convocation_id', convocationIds)
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

  // specs/player-stats.md §6.3/§6.2 — get_my_response_summary(), SECURITY
  // INVOKER (supabase/migrations/20260928120000_player_stats_summary_rpcs.sql):
  // convocation_responses_select_own_or_coach already grants a player SELECT
  // on their own rows, so no elevated-privilege function is needed here. No
  // parameter: filters on auth.uid() internally (AC-02). `single()` is safe
  // for the same reason as AttendanceRecordRepositoryImpl.getOwnAttendanceSummary
  // — no GROUP BY, always exactly one aggregate row.
  async getOwnResponseSummary(): Promise<ResponseSummary> {
    const { data, error } = await this.client.rpc('get_my_response_summary').single<ResponseSummaryDto>()

    if (error) throw mapSupabaseError(error)

    return toResponseSummary(data as ResponseSummaryDto)
  }
}
