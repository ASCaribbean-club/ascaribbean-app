import type { SupabaseClient } from '@supabase/supabase-js'
import type { ConvocationMission, ConvocationMissionWithAssignees, MissionAssignment } from '@domain/entities/convocation-mission'
import { NotFoundError } from '@domain/errors/not-found-error'
import type { ConvocationMissionRepository, NewAdHocMission } from '@domain/repositories/convocation-mission-repository'
import type { ConvocationMissionListDto } from '../dto/convocation-mission-list-dto'
import type { ConvocationMissionRow } from '../dto/convocation-mission-row'
import type { MissionAssignmentRow } from '../dto/mission-assignment-row'
import { mapSupabaseError } from '../errors/map-supabase-error'
import {
  toAdHocMissionInsertRow,
  toConvocationMission,
  toConvocationMissionsWithAssignees,
  toMissionAssignment,
} from '../mappers/convocation-mission-mapper'

const MISSION_COLUMNS = 'id, convocation_id, template_id, label, capacity'

// specs/match-details-missions.md §2.5. Authorization is the database's:
//  - read: get_convocation_missions RPC (explicit scope check, security definer)
//  - claim: claim_mission RPC, the ONLY way to insert a mission_assignments row
//  - release / remove / addAdHoc: RLS policies on mission_assignments and
//    convocation_missions ('mission:self-assign' / 'mission:manage').
export class ConvocationMissionRepositoryImpl implements ConvocationMissionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listForConvocation(convocationId: string): Promise<ConvocationMissionWithAssignees[]> {
    const { data, error } = await this.client.rpc('get_convocation_missions', { p_convocation_id: convocationId })

    if (error) throw mapSupabaseError(error)
    return toConvocationMissionsWithAssignees((data ?? []) as ConvocationMissionListDto[])
  }

  async claim(missionId: string, userId: string): Promise<MissionAssignment> {
    const { data, error } = await this.client
      .rpc('claim_mission', { p_mission_id: missionId, p_user_id: userId })
      .single<MissionAssignmentRow>()

    if (error) throw mapSupabaseError(error)
    return toMissionAssignment(data)
  }

  async release(missionId: string, userId: string): Promise<void> {
    const { data, error } = await this.client
      .from('mission_assignments')
      .delete()
      .eq('mission_id', missionId)
      .eq('user_id', userId)
      .select('mission_id')

    if (error) throw mapSupabaseError(error)
    // RLS filters a forbidden delete silently: zero rows means nothing was
    // removed (already gone, or not allowed), never a success to report.
    if (!data || data.length === 0) throw new NotFoundError(`Assignment not found: ${missionId}/${userId}`)
  }

  async addAdHoc(input: NewAdHocMission): Promise<ConvocationMission> {
    const { data, error } = await this.client
      .from('convocation_missions')
      .insert(toAdHocMissionInsertRow(input))
      .select(MISSION_COLUMNS)
      .single()
      .overrideTypes<ConvocationMissionRow>()

    if (error) throw mapSupabaseError(error)
    return toConvocationMission(data)
  }

  async remove(missionId: string): Promise<void> {
    const { data, error } = await this.client
      .from('convocation_missions')
      .delete()
      .eq('id', missionId)
      .select('id')

    if (error) throw mapSupabaseError(error)
    if (!data || data.length === 0) throw new NotFoundError(`Mission not found: ${missionId}`)
  }
}
