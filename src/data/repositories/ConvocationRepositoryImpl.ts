import type { SupabaseClient } from '@supabase/supabase-js'
import type { Convocation } from '@domain/entities/convocation'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { ConvocationRow } from '../dto/convocation-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toConvocation } from '../mappers/convocation-mapper'

const CONVOCATION_COLUMNS =
  'id, team_id, type, date, location, status, closed_at, closed_by, cancelled_at, cancelled_by, cancellation_reason'

export class ConvocationRepositoryImpl implements ConvocationRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async listForTeam(teamId: string): Promise<Convocation[]> {
    const { data, error } = await this.client
      .from('convocations')
      .select(CONVOCATION_COLUMNS)
      .eq('team_id', teamId)
      .order('date', { ascending: false })
      .returns<ConvocationRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toConvocation)
  }

  async findById(id: string): Promise<Convocation | null> {
    const { data, error } = await this.client
      .from('convocations')
      .select(CONVOCATION_COLUMNS)
      .eq('id', id)
      .maybeSingle<ConvocationRow>()

    if (error) throw mapSupabaseError(error)
    return data ? toConvocation(data) : null
  }
}
