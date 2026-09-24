import type { MatchEvent } from '@domain/entities/match-event'
import type { MatchEventRow } from '../dto/match-event-dto'

export function toMatchEvent(row: MatchEventRow): MatchEvent {
  return {
    id: row.id,
    convocationId: row.convocation_id,
    userId: row.user_id,
    eventType: row.event_type,
    isPenalty: row.is_penalty,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

// Only the columns a client INSERT actually provides — `id`/`created_at`
// are database-generated defaults (same reasoning as
// MatchEventRepository.add's own `Omit<MatchEvent, 'id' | 'createdAt'>`
// input type).
export function toMatchEventInsertRow(
  event: Omit<MatchEvent, 'id' | 'createdAt'>,
): Omit<MatchEventRow, 'id' | 'created_at'> {
  return {
    convocation_id: event.convocationId,
    user_id: event.userId,
    event_type: event.eventType,
    is_penalty: event.isPenalty,
    created_by: event.createdBy,
  }
}
