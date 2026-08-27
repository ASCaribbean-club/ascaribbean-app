import type { Convocation, ConvocationResponse } from '@domain/entities/convocation'
import type { ConvocationResponseRow, ConvocationRow } from '../dto/convocation-dto'

export function toConvocation(row: ConvocationRow): Convocation {
  return {
    id: row.id,
    teamId: row.team_id,
    type: row.type,
    date: row.date,
    location: row.location,
    status: row.status,
    closedAt: row.closed_at,
    closedBy: row.closed_by,
    cancelledAt: row.cancelled_at,
    cancelledBy: row.cancelled_by,
    cancellationReason: row.cancellation_reason,
    createdBy: row.created_by,
  }
}

export function toConvocationResponse(row: ConvocationResponseRow): ConvocationResponse {
  return {
    id: row.id,
    convocationId: row.convocation_id,
    userId: row.user_id,
    status: row.status,
    reason: row.reason,
    respondedAt: row.responded_at,
  }
}

// Reverse of toConvocationResponse above — needed by
// ConvocationResponseRepositoryImpl.upsert (specs/player-dashboard.md,
// RespondToConvocationUseCase). CLAUDE.md §4: a mapper is always present
// between DTO and entity, in both directions, never skipped.
export function toConvocationResponseRow(
  response: Omit<ConvocationResponse, 'id'>,
): Omit<ConvocationResponseRow, 'id'> {
  return {
    convocation_id: response.convocationId,
    user_id: response.userId,
    status: response.status,
    reason: response.reason,
    responded_at: response.respondedAt,
  }
}
