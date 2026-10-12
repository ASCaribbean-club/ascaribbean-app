import type { LineupJerseyNumbers, LineupSlots, MatchLineup } from '@domain/entities/match-lineup'
import { LINEUP_SLOT_COUNT } from '@domain/entities/match-lineup'
import { isFormation, isValidJerseyNumber } from '@domain/policies/match-lineup-rules'
import type { LineupDefaultJerseyNumberDto, MatchLineupSlotDto } from '../dto/match-lineup-dto'

// No rows = no lineup (null). An unknown stored formation cannot happen (DB
// check constraint) but is treated as "no lineup" rather than trusted blindly.
export function toMatchLineup(convocationId: string, dtos: MatchLineupSlotDto[]): MatchLineup | null {
  if (dtos.length === 0) return null
  const formation = dtos[0].formation
  if (!isFormation(formation)) return null
  return {
    convocationId,
    formation,
    placements: dtos
      .map((dto) => ({
        slotIndex: dto.slot_index,
        userId: dto.user_id,
        displayName: dto.display_name,
        // null/absent/out-of-range (cannot happen: DB check) -> no number.
        jerseyNumber: dto.jersey_number != null && isValidJerseyNumber(dto.jersey_number) ? dto.jersey_number : null,
      }))
      .sort((a, b) => a.slotIndex - b.slotIndex),
  }
}

// Domain slots -> the jsonb payload of save_match_lineup: only occupied
// slots are sent, free ones are simply absent. Each carries the number worn
// for this match (null when none), taken from the per-player map.
export function toSaveSlotsPayload(
  slots: LineupSlots,
  jerseyNumbers: LineupJerseyNumbers = {},
): { slot_index: number; user_id: string; jersey_number: number | null }[] {
  return slots
    .slice(0, LINEUP_SLOT_COUNT)
    .flatMap((userId, slotIndex) =>
      userId === null ? [] : [{ slot_index: slotIndex, user_id: userId, jersey_number: jerseyNumbers[userId] ?? null }],
    )
}

export function toDefaultJerseyNumbers(dtos: LineupDefaultJerseyNumberDto[]): Record<string, number> {
  const defaults: Record<string, number> = {}
  for (const dto of dtos) {
    if (isValidJerseyNumber(dto.jersey_number)) defaults[dto.user_id] = dto.jersey_number
  }
  return defaults
}
