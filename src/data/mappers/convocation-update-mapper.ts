import type {
  UpdateMatchConvocationPayload,
  UpdateMeetingConvocationPayload,
  UpdateTrainingConvocationPayload,
} from '@domain/usecases/convocation/UpdateConvocationUseCase'
import type {
  UpdateMatchConvocationRpcParams,
  UpdateMeetingConvocationRpcParams,
  UpdateTrainingConvocationRpcParams,
} from '../dto/admin-convocation-dto'

// specs/web-create-convocation.md §3 — entity-side payload to RPC parameter
// objects (CLAUDE.md §4: a mapper, never skipped). Deliberately no team, type
// or status parameter: the RPCs can't be asked to change them.
export function toUpdateTrainingRpcParams(payload: UpdateTrainingConvocationPayload): UpdateTrainingConvocationRpcParams {
  return {
    p_convocation_id: payload.convocationId,
    p_date: payload.date,
    p_training_location_id: payload.trainingLocationId,
  }
}

export function toUpdateMatchRpcParams(payload: UpdateMatchConvocationPayload): UpdateMatchConvocationRpcParams {
  return {
    p_convocation_id: payload.convocationId,
    p_date: payload.date,
    p_location: payload.location,
    p_opponent_id: payload.opponentId,
    p_is_home: payload.isHome,
    p_meeting_point_time: payload.meetingPointTime,
    p_meeting_point_location: payload.meetingPointLocation,
  }
}

export function toUpdateMeetingRpcParams(payload: UpdateMeetingConvocationPayload): UpdateMeetingConvocationRpcParams {
  return {
    p_convocation_id: payload.convocationId,
    p_date: payload.date,
    p_location: payload.location,
    p_title: payload.title,
    p_agenda: payload.agenda,
  }
}
