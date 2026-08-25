import type { SupabaseClient } from '@supabase/supabase-js'
import type { Convocation } from '@domain/entities/convocation'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type {
  CreateMatchConvocationInput,
  CreateMeetingConvocationInput,
  CreateTrainingConvocationInput,
} from '@domain/usecases/convocation/CreateConvocationUseCase'
import type { ConvocationRow } from '../dto/convocation-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toConvocation } from '../mappers/convocation-mapper'

const CONVOCATION_COLUMNS =
  'id, team_id, type, date, location, status, closed_at, closed_by, cancelled_at, cancelled_by, cancellation_reason, created_by'

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

  // Each create* method calls a dedicated Postgres RPC (see
  // supabase/migrations/) that inserts the convocation row and its
  // type-specific satellite in a single PL/pgSQL transaction — the RPC
  // returns the created `convocations` row directly (not SETOF), so
  // `.single()` is correct here (never a legitimate zero-row result, unlike
  // SeasonRepositoryImpl.findCurrent's `.maybeSingle()`).

  async createTraining(input: CreateTrainingConvocationInput): Promise<Convocation> {
    const { data, error } = await this.client
      .rpc('create_training_convocation', {
        p_team_id: input.teamId,
        p_created_by: input.createdBy,
        p_date: input.date,
        p_location: input.location,
      })
      .single<ConvocationRow>()

    if (error) throw mapSupabaseError(error)
    return toConvocation(data)
  }

  async createMatch(input: CreateMatchConvocationInput): Promise<Convocation> {
    const { data, error } = await this.client
      .rpc('create_match_convocation', {
        p_team_id: input.teamId,
        p_created_by: input.createdBy,
        p_date: input.date,
        p_location: input.location,
        p_opponent_id: input.opponentId,
        p_is_home: input.isHome,
        p_meeting_point_time: input.meetingPointTime,
        p_meeting_point_location: input.meetingPointLocation,
      })
      .single<ConvocationRow>()

    if (error) throw mapSupabaseError(error)
    return toConvocation(data)
  }

  async createMeeting(input: CreateMeetingConvocationInput): Promise<Convocation> {
    const { data, error } = await this.client
      .rpc('create_meeting_convocation', {
        p_team_id: input.teamId,
        p_created_by: input.createdBy,
        p_date: input.date,
        p_location: input.location,
        p_title: input.title,
        p_agenda: input.agenda,
      })
      .single<ConvocationRow>()

    if (error) throw mapSupabaseError(error)
    return toConvocation(data)
  }
}