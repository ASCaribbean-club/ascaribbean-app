import type { SupabaseClient } from '@supabase/supabase-js'
import type { Convocation, ConvocationArrangements } from '@domain/entities/convocation'
import { NotFoundError } from '@domain/errors/not-found-error'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type {
  CreateMatchConvocationInput,
  CreateMeetingConvocationInput,
  CreateTrainingConvocationInput,
} from '@domain/usecases/convocation/CreateConvocationUseCase'
import type {
  UpdateMatchConvocationPayload,
  UpdateMeetingConvocationPayload,
  UpdateTrainingConvocationPayload,
} from '@domain/usecases/convocation/UpdateConvocationUseCase'
import type { ConvocationRow } from '../dto/convocation-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toConvocation, toConvocationArrangementsUpdateRow, toConvocationDateUpdateRow } from '../mappers/convocation-mapper'
import { toUpdateMatchRpcParams, toUpdateMeetingRpcParams, toUpdateTrainingRpcParams } from '../mappers/convocation-update-mapper'

// specs/web-localizations.md §2.6/AC-WL-19 — the venue's name/address are
// resolved by a PostgREST embedded join on the FK, never copied onto the
// convocation. It runs under the caller's RLS (training_locations is readable
// by every authenticated account), so no security-definer view is involved.
export const CONVOCATION_COLUMNS =
  'id, team_id, type, date, location, training_location_id, training_location:training_locations(id, name, address, is_archived), status, closed_at, closed_by, cancelled_at, cancelled_by, cancellation_reason, created_by, created_at'

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
      .overrideTypes<ConvocationRow[]>()

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
        p_training_location_id: input.trainingLocationId,
      })
      .single<ConvocationRow>()

    if (error) throw mapSupabaseError(error)

    // The RPC returns the bare convocations row (no embedded join), so the
    // venue's name/address are resolved by a follow-up read of the same row.
    const created = await this.findById(data.id)
    if (!created) throw new NotFoundError(`Created convocation ${data.id} not readable`)
    return created
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

  // specs/edit-match-details.md, developer decision (2026-09-25) — a plain
  // `.update()`, limited to `date`/`location` (CONVOCATION_COLUMNS is still
  // used for `.select()` so the full row comes back). Same reasoning as
  // MatchDetailsRepositoryImpl.updateArrangements: never a generic upsert,
  // never a full `update(Convocation)` that could drift into writing
  // `status`/`type`/`teamId` — `grant update (date, location)` (see the
  // migration this comment names) makes any other column structurally
  // unwritable through this path even from a forged request.
  async updateArrangements(id: string, arrangements: ConvocationArrangements): Promise<Convocation> {
    const { data, error } = await this.client
      .from('convocations')
      .update(toConvocationArrangementsUpdateRow(arrangements))
      .eq('id', id)
      .select(CONVOCATION_COLUMNS)
      .single()
      .overrideTypes<ConvocationRow>()

    if (error) throw mapSupabaseError(error)
    return toConvocation(data)
  }

  async updateDate(id: string, date: string): Promise<Convocation> {
    const { data, error } = await this.client
      .from('convocations')
      .update(toConvocationDateUpdateRow(date))
      .eq('id', id)
      .select(CONVOCATION_COLUMNS)
      .single()
      .overrideTypes<ConvocationRow>()

    if (error) throw mapSupabaseError(error)
    return toConvocation(data)
  }

  // specs/web-create-convocation.md §3/AC-WC-20 — one RPC per type, none of
  // them SECURITY DEFINER (the admin RLS policies and the guard triggers apply
  // to every statement inside). Each runs the convocation UPDATE and the
  // satellite UPDATE in a single transaction: if one is refused, nothing is
  // written. Like the create* methods, the RPC returns the bare row, so the
  // venue's name/address come from a follow-up read.
  async updateTraining(payload: UpdateTrainingConvocationPayload): Promise<Convocation> {
    const { error } = await this.client.rpc('update_training_convocation', toUpdateTrainingRpcParams(payload))
    if (error) throw mapSupabaseError(error)
    return this.readAfterUpdate(payload.convocationId)
  }

  async updateMatch(payload: UpdateMatchConvocationPayload): Promise<Convocation> {
    const { error } = await this.client.rpc('update_match_convocation', toUpdateMatchRpcParams(payload))
    if (error) throw mapSupabaseError(error)
    return this.readAfterUpdate(payload.convocationId)
  }

  async updateMeeting(payload: UpdateMeetingConvocationPayload): Promise<Convocation> {
    const { error } = await this.client.rpc('update_meeting_convocation', toUpdateMeetingRpcParams(payload))
    if (error) throw mapSupabaseError(error)
    return this.readAfterUpdate(payload.convocationId)
  }

  private async readAfterUpdate(id: string): Promise<Convocation> {
    const updated = await this.findById(id)
    if (!updated) throw new NotFoundError(`Updated convocation ${id} not readable`)
    return updated
  }
}
